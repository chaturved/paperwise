export type DocumentStatus = "uploading" | "processing" | "ready" | "failed";

export interface LibraryDoc {
  id: number;
  name: string;
  type: string;
  size: number;
  created_at: string;
  status: DocumentStatus;
  error_message: string | null;
}

export interface LibraryData {
  count: number;
  total_size_bytes: number;
  sections: LibraryDoc[];
}

export interface UploadError {
  file: string;
  error: string;
}

export interface UploadSlot {
  id: number;
  name: string;
  upload_url: string;
  headers: Record<string, string>;
}

export interface CreateUploadsResponse {
  uploads: UploadSlot[];
}
