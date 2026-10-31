import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FollowUpSuggestions } from "./follow-up-suggestions";

afterEach(cleanup);

describe("FollowUpSuggestions", () => {
  it("renders nothing without suggestions", () => {
    const { container } = render(<FollowUpSuggestions questions={[]} onPick={() => {}} />);

    expect(container.firstChild).toBeNull();
  });

  it("sends the question that was picked", () => {
    const onPick = vi.fn();
    render(<FollowUpSuggestions questions={["Who pays?", "When is it due?"]} onPick={onPick} />);

    fireEvent.click(screen.getByRole("button", { name: "When is it due?" }));

    expect(onPick).toHaveBeenCalledExactlyOnceWith("When is it due?");
  });
});
