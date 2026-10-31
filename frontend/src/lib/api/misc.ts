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
