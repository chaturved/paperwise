"use client";

import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api-error";
import { useDocumentUpload } from "./useDocumentUpload";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

export function useAttachDocuments(onChange?: () => void) {
  const { upload, uploading, progress } = useDocumentUpload(onChange);

  const attach = async (files: File[]) => {
    try {
      const { uploadedIds, errors } = await upload(files);
      if (uploadedIds.length) toast.success(`Added ${plural(uploadedIds.length, "document")} to your library`);
      if (errors.length) toast.error(`${plural(errors.length, "file")} could not be uploaded`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not upload your documents"));
    }
  };

  return { attach, uploading, progress };
}
