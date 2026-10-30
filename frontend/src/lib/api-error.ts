import axios from "axios";

/** The plain-language message the API sent with an error, or `fallback` when there isn't one. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === "string") return err.response.data.error;
  return fallback;
}
