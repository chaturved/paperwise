import axios from "axios";
import apiClient from "@/lib/api-client";
import type { CreateUploadsResponse, LibraryData, LibraryDoc, MessageResponse, UploadSlot } from "@/types";

export const getLibrary = async (): Promise<LibraryData> => {
  const res = await apiClient.get("/v1/library");
  return res.data;
};

export const createUploads = async (files: File[]): Promise<CreateUploadsResponse> => {
  const res = await apiClient.post("/v1/library/uploads", {
    files: files.map((f) => ({ name: f.name, size: f.size })),
  });
  return res.data;
};

// The file goes straight to storage. This is deliberately plain axios, not apiClient:
// the signed URL is not our API and must not receive our auth cookie.
export const putToStorage = async (
  slot: UploadSlot,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> => {
  await axios.put(slot.upload_url, file, {
    headers: slot.headers,
    onUploadProgress: (event) => {
      if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
};

export const completeUpload = async (id: number): Promise<LibraryDoc> => {
  const res = await apiClient.post(`/v1/library/${id}/complete`);
  return res.data;
};

export const retryDocument = async (id: number): Promise<LibraryDoc> => {
  const res = await apiClient.post(`/v1/library/${id}/retry`);
  return res.data;
};

export const deleteDocument = async (id: number): Promise<MessageResponse> => {
  const res = await apiClient.delete(`/v1/library/${id}`);
  return res.data;
};

export const clearLibrary = async (): Promise<MessageResponse> => {
  const res = await apiClient.delete("/v1/library/clear");
  return res.data;
};
