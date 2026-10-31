import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/types";
import { useFollowUps } from "./useFollowUps";

const mocks = vi.hoisted(() => ({ getFollowUps: vi.fn(), failure: null as Error | null }));

// A plain wrapper: vitest reports a rejected promise returned by a mock as unhandled even when the code under test catches it.
vi.mock("@/lib/api/conversations", () => ({
  getFollowUps: (id: number) => (mocks.failure ? Promise.reject(mocks.failure) : mocks.getFollowUps(id)),
}));

beforeEach(() => {
  mocks.getFollowUps.mockReset().mockResolvedValue(["Who pays?"]);
  mocks.failure = null;
});

const message = (role: Message["role"], changes: Partial<Message> = {}): Message => ({
  id: 1,
  role,
  content: "text",
  meta: null,
  created_at: "2026-10-31T00:00:00Z",
  ...changes,
});

const asked = [message("user")];
const answered = [message("user"), message("assistant", { id: 2 })];

type Props = { messages: Message[]; streaming: boolean };

const mount = (initial: Props) =>
  renderHook(({ messages, streaming }: Props) => useFollowUps(5, messages, streaming), { initialProps: initial });

describe("useFollowUps", () => {
  it("does not suggest anything for a conversation that was only opened", () => {
    const { result } = mount({ messages: answered, streaming: false });

    expect(result.current).toEqual([]);
    expect(mocks.getFollowUps).not.toHaveBeenCalled();
  });

  it("suggests questions once a streamed answer has finished", async () => {
    const { result, rerender } = mount({ messages: asked, streaming: true });
    expect(result.current).toEqual([]);

    rerender({ messages: answered, streaming: false });

    await waitFor(() => expect(result.current).toEqual(["Who pays?"]));
    expect(mocks.getFollowUps).toHaveBeenCalledWith(5);
  });

  it("skips an answer that failed", () => {
    const failed = [message("user"), message("assistant", { failed: true })];
    const { rerender } = mount({ messages: asked, streaming: true });

    rerender({ messages: failed, streaming: false });

    expect(mocks.getFollowUps).not.toHaveBeenCalled();
  });

  it("clears the suggestions when the next question starts", async () => {
    const { result, rerender } = mount({ messages: asked, streaming: true });
    rerender({ messages: answered, streaming: false });
    await waitFor(() => expect(result.current).toEqual(["Who pays?"]));

    rerender({ messages: answered, streaming: true });

    expect(result.current).toEqual([]);
  });

  it("stays quiet when the suggestions cannot be fetched", async () => {
    mocks.failure = new Error("boom");
    const { result, rerender } = mount({ messages: asked, streaming: true });

    rerender({ messages: answered, streaming: false });

    await Promise.resolve();
    expect(result.current).toEqual([]);
  });
});
