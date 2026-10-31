import axios from "axios";

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === "string") return err.response.data.error;
  return fallback;
}

export function historyLimitReached(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 402 && err.response.data?.error?.limit === "history";
}

export function rateLimitMessage(err: unknown): string | null {
  if (axios.isAxiosError(err) && err.response?.status === 429) {
    return apiErrorMessage(err, "Too many requests. Please wait a moment and try again.");
  }
  return null;
}
