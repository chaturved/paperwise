export type DocumentStatus = "uploading" | "processing" | "ready" | "failed";

export interface LibraryDoc {
  id: number;
  name: string;
  type: string;
  size: number;
  created_at: string;
  status: DocumentStatus;
  error_message: string | null;
  pages: number | null;
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

export interface DocumentFile {
  url: string;
  expires_in: number;
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

export interface KeyDate {
  label: string;
  date: string | null;
  timing: string | null;
  quote: string;
  page: number | null;
  year_assumed: boolean;
}
