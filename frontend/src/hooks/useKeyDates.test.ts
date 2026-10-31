import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKeyDates } from "./useKeyDates";

const mocks = vi.hoisted(() => ({ getKeyDates: vi.fn(), failure: null as Error | null }));

// A plain wrapper: vitest reports a rejected promise returned by a mock as unhandled even when the code under test catches it.
vi.mock("@/lib/api/documents", () => ({
  getKeyDates: (id: number) => (mocks.failure ? Promise.reject(mocks.failure) : mocks.getKeyDates(id)),
}));

beforeEach(() => {
  mocks.getKeyDates.mockReset();
  mocks.failure = null;
});

const found = {
  label: "Renewal",
  date: "2027-01-01",
  timing: null,
  quote: "Renews 1 Jan.",
  page: 2,
  year_assumed: false,
};

describe("useKeyDates", () => {
  it("does nothing without a document", () => {
    const { result } = renderHook(() => useKeyDates(null));

    expect(result.current.loading).toBe(false);
    expect(mocks.getKeyDates).not.toHaveBeenCalled();
  });

  it("loads the dates of a document", async () => {
    mocks.getKeyDates.mockResolvedValue([found]);
    const { result } = renderHook(() => useKeyDates(3));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.dates).toEqual([found]));

    expect(result.current.loading).toBe(false);
    expect(mocks.getKeyDates).toHaveBeenCalledWith(3);
  });

  it("reports an error instead of loading forever", async () => {
    mocks.failure = new Error("boom");
    const { result } = renderHook(() => useKeyDates(3));

    await waitFor(() => expect(result.current.error).toBe("Could not read the dates in this file."));

    expect(result.current.loading).toBe(false);
  });

  it("starts over when another document is opened", async () => {
    mocks.getKeyDates.mockResolvedValueOnce([found]).mockResolvedValueOnce([]);
    const { result, rerender } = renderHook(({ id }) => useKeyDates(id), { initialProps: { id: 3 } });
    await waitFor(() => expect(result.current.dates).toEqual([found]));

    rerender({ id: 4 });

    await waitFor(() => expect(result.current.dates).toEqual([]));
    expect(mocks.getKeyDates).toHaveBeenLastCalledWith(4);
  });
});
