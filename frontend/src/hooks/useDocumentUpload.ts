import { useState } from "react";
import { completeUpload, createUploads, deleteDocument, putToStorage } from "@/lib/api/documents";
import type { UploadError } from "@/types";

export interface UploadOutcome {
  uploadedIds: number[];
  errors: UploadError[];
}

/**
 * Uploads files straight to storage, then tells the API each one has arrived so it can process it.
 * `progress` maps a document id to its upload percentage while the file is being sent.
 * `onChange` fires when documents are created or finish uploading, so the caller can refresh its list.
 */
export function useDocumentUpload(onChange?: () => void) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<number, number>>({});

  const setPercent = (id: number, percent: number) => setProgress((prev) => ({ ...prev, [id]: percent }));
  const clearPercent = (id: number) =>
    setProgress((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => Number(key) !== id)));

  const upload = async (files: File[]): Promise<UploadOutcome> => {
    setUploading(true);
    try {
      // Rejected as a whole (plan limit, file type, size): the caller shows the API's message.
      const { uploads } = await createUploads(files);
      onChange?.();

      const errors: UploadError[] = [];
      const uploadedIds: number[] = [];

      await Promise.all(
        uploads.map(async (slot, index) => {
          try {
            setPercent(slot.id, 0);
            await putToStorage(slot, files[index], (percent) => setPercent(slot.id, percent));
            await completeUpload(slot.id);
            uploadedIds.push(slot.id);
          } catch {
            errors.push({ file: slot.name, error: "Upload failed. Please try again." });
            await deleteDocument(slot.id).catch(() => {}); // frees the reserved slot; stale cleanup is the backstop
          } finally {
            clearPercent(slot.id);
          }
        }),
      );

      onChange?.();
      return { uploadedIds, errors };
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress };
}
