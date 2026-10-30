import apiClient from "@/lib/api-client";

export const joinWaitlist = async (email: string): Promise<void> => {
  await apiClient.post("/v1/waitlist", { email });
};

export interface DemoRequestPayload {
  name: string;
  email: string;
  company?: string;
  team_size?: "solo" | "2-10" | "11-50" | "51+";
  message?: string;
  website: string;
}

export const requestDemo = async (payload: DemoRequestPayload): Promise<void> => {
  await apiClient.post("/v1/demo-requests", payload);
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
