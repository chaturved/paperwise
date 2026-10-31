import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KeyDate, LibraryDoc } from "@/types";
import { KeyDatesDialog } from "./key-dates-dialog";

const mocks = vi.hoisted(() => ({ useKeyDates: vi.fn(), downloadBlob: vi.fn() }));

vi.mock("@/hooks/useKeyDates", () => ({ useKeyDates: mocks.useKeyDates }));
vi.mock("@/lib/download", () => ({ downloadBlob: mocks.downloadBlob }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

const doc: LibraryDoc = {
  id: 3,
  name: "lease.pdf",
  type: "pdf",
  size: 100,
  created_at: "2026-10-31T00:00:00Z",
  status: "ready",
  error_message: null,
  pages: 4,
};

const dated: KeyDate = {
  label: "Renewal",
  date: "2027-01-01",
  timing: null,
  quote: "The lease renews on 1 January.",
  page: 2,
  year_assumed: true,
};
const undated: KeyDate = {
  ...dated,
  quote: "Give notice 30 days before the end.",
  label: "Notice",
  date: null,
  timing: "30 days before the end",
  page: null,
  year_assumed: false,
};

const show = (state: { dates?: KeyDate[] | null; error?: string | null; loading?: boolean }) => {
  mocks.useKeyDates.mockReturnValue({ dates: null, error: null, loading: false, ...state });
  render(<KeyDatesDialog document={doc} open onOpenChange={() => {}} />);
};

describe("KeyDatesDialog", () => {
  it("does not read the document while closed", () => {
    render(<KeyDatesDialog document={doc} open={false} onOpenChange={() => {}} />);

    expect(mocks.useKeyDates).not.toHaveBeenCalled();
  });

  it("says it is reading while the dates load", () => {
    show({ loading: true });

    expect(screen.getByText(/reading the document/i)).toBeTruthy();
  });

  it("shows the error", () => {
    show({ error: "Could not read the dates in this file." });

    expect(screen.getByText("Could not read the dates in this file.")).toBeTruthy();
  });

  it("says when there are no dates", () => {
    show({ dates: [] });

    expect(screen.getByText(/no dates or deadlines/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /add to calendar/i })).toBeNull();
  });

  it("shows each date with its quote, page and a warning when the year was assumed", () => {
    show({ dates: [dated, undated] });

    expect(screen.getByText("Renewal")).toBeTruthy();
    expect(screen.getByText(/The lease renews on 1 January/)).toBeTruthy();
    expect(screen.getByText(/page 2/)).toBeTruthy();
    expect(screen.getByText(/year taken from elsewhere/)).toBeTruthy();
    expect(screen.getByText("30 days before the end")).toBeTruthy();
  });

  it("downloads a calendar file named after the document", () => {
    show({ dates: [dated] });

    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    expect(mocks.downloadBlob).toHaveBeenCalledOnce();
    expect(mocks.downloadBlob.mock.calls[0][0]).toBe("lease-key-dates.ics");
  });

  it("offers no calendar file when no date has a calendar day", () => {
    show({ dates: [undated] });

    expect(screen.queryByRole("button", { name: /add to calendar/i })).toBeNull();
  });
});
