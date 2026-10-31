import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";

import { apiErrorMessage, historyLimitReached, rateLimitMessage } from "./api-error";

function failure(status: number, data: unknown): AxiosError {
  const error = new AxiosError("failed");
  error.response = { status, data } as AxiosResponse;
  return error;
}

describe("apiErrorMessage", () => {
  it("returns the message the backend sent", () => {
    expect(apiErrorMessage(failure(400, { error: "Bad file" }), "fallback")).toBe("Bad file");
  });

  it("falls back for other errors", () => {
    expect(apiErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
    expect(apiErrorMessage(failure(500, {}), "fallback")).toBe("fallback");
  });
});

describe("historyLimitReached", () => {
  it("is true only for a 402 about history", () => {
    expect(historyLimitReached(failure(402, { error: { limit: "history" } }))).toBe(true);
    expect(historyLimitReached(failure(402, { error: { limit: "uploads" } }))).toBe(false);
    expect(historyLimitReached(failure(400, { error: { limit: "history" } }))).toBe(false);
    expect(historyLimitReached(new Error("boom"))).toBe(false);
  });
});

describe("rateLimitMessage", () => {
  it("returns the backend message on a 429", () => {
    expect(rateLimitMessage(failure(429, { error: "Slow down" }))).toBe("Slow down");
  });

  it("uses a default message when the backend sent none", () => {
    expect(rateLimitMessage(failure(429, {}))).toMatch(/too many requests/i);
  });

  it("is null for other errors", () => {
    expect(rateLimitMessage(failure(500, {}))).toBeNull();
    expect(rateLimitMessage(new Error("boom"))).toBeNull();
  });
});
