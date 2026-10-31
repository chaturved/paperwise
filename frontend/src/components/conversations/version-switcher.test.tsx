import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/types";
import { VersionSwitcher, versionsOf } from "./version-switcher";

afterEach(cleanup);

const message = (changes: Partial<Message> = {}): Message => ({
  id: 5,
  role: "user",
  content: "q",
  meta: null,
  created_at: "2026-10-31T00:00:00Z",
  ...changes,
});

describe("versionsOf", () => {
  it("has nothing to switch between for a message with one version", () => {
    expect(versionsOf(message())).toBeUndefined();
    expect(versionsOf(message({ version: 1, versions: 1, sibling_ids: [5] }))).toBeUndefined();
  });

  it("describes a message that has several versions", () => {
    expect(versionsOf(message({ version: 2, versions: 3, sibling_ids: [4, 5, 9] }))).toEqual({
      version: 2,
      count: 3,
      siblingIds: [4, 5, 9],
    });
  });

  it("ignores a message whose version list does not add up", () => {
    expect(versionsOf(message({ version: 1, versions: 3, sibling_ids: [4] }))).toBeUndefined();
  });
});

describe("VersionSwitcher", () => {
  const versions = { version: 2, count: 3, siblingIds: [4, 5, 9] };

  it("shows which version is on screen", () => {
    render(<VersionSwitcher versions={versions} onSwitch={() => {}} />);

    expect(screen.getByText("2/3")).toBeTruthy();
  });

  it("switches to the previous and the next version by their message ids", () => {
    const onSwitch = vi.fn();
    render(<VersionSwitcher versions={versions} onSwitch={onSwitch} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous version" }));
    fireEvent.click(screen.getByRole("button", { name: "Next version" }));

    expect(onSwitch.mock.calls).toEqual([[4], [9]]);
  });

  it("cannot go before the first version or past the last", () => {
    const { rerender } = render(<VersionSwitcher versions={{ ...versions, version: 1 }} onSwitch={() => {}} />);
    expect((screen.getByRole("button", { name: "Previous version" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<VersionSwitcher versions={{ ...versions, version: 3 }} onSwitch={() => {}} />);
    expect((screen.getByRole("button", { name: "Next version" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("cannot be used while disabled", () => {
    render(<VersionSwitcher versions={versions} onSwitch={() => {}} disabled />);

    expect((screen.getByRole("button", { name: "Next version" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
