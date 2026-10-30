import axios from "axios";

/** The plain-language message the API sent with an error, or `fallback` when there isn't one. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === "string") return err.response.data.error;
  return fallback;
}

/** The API's "wait a moment" message when the request was rate limited, otherwise null. */
export function rateLimitMessage(err: unknown): string | null {
  if (axios.isAxiosError(err) && err.response?.status === 429) {
    return apiErrorMessage(err, "Too many requests. Please wait a moment and try again.");
  }
  return null;
}
