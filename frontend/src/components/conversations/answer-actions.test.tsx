import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnswerActions } from "./answer-actions";

const mocks = vi.hoisted(() => ({ setFeedback: vi.fn(), toastSuccess: vi.fn() }));

vi.mock("@/lib/api/analytics", () => ({ setFeedback: mocks.setFeedback }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess } }));

beforeEach(() => {
  mocks.setFeedback.mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText: vi.fn() } });
});
afterEach(cleanup);

const renderActions = (props: Partial<React.ComponentProps<typeof AnswerActions>> = {}) =>
  render(<AnswerActions messageId={7} content="The fee is $5." sources={[]} {...props} />);

const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");

describe("AnswerActions", () => {
  it("copies the answer", () => {
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("The fee is $5.");
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it("only offers rewrite and new chat when the caller handles them", () => {
    const onRewrite = vi.fn();
    const onBranch = vi.fn();
    const { rerender } = renderActions();
    expect(screen.queryByRole("button", { name: /rewrite/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /new chat from here/i })).toBeNull();

    rerender(<AnswerActions messageId={7} content="x" sources={[]} onRewrite={onRewrite} onBranch={onBranch} />);
    fireEvent.click(screen.getByRole("button", { name: /rewrite/i }));
    fireEvent.click(screen.getByRole("button", { name: /new chat from here/i }));

    expect(onRewrite).toHaveBeenCalledOnce();
    expect(onBranch).toHaveBeenCalledWith(7);
  });

  it("saves a rating and lets the user take it back", async () => {
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Helpful" }));
    await waitFor(() => expect(mocks.setFeedback).toHaveBeenCalledWith(7, "up"));
    expect(pressed("Helpful")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Helpful" }));
    expect(pressed("Helpful")).toBe("false");
    expect(mocks.setFeedback).toHaveBeenCalledOnce();
  });

  it("undoes the rating when saving it fails", async () => {
    mocks.setFeedback.mockRejectedValue(new Error("offline"));
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Not helpful" }));

    await waitFor(() => expect(pressed("Not helpful")).toBe("false"));
  });

  it("does not rate an answer that has no id yet", () => {
    renderActions({ messageId: undefined });

    fireEvent.click(screen.getByRole("button", { name: "Helpful" }));

    expect(mocks.setFeedback).not.toHaveBeenCalled();
  });
});
