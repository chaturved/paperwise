import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@/types";

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  sendStream: vi.fn(),
  resetStream: vi.fn(),
  onDone: undefined as ((content: string, meta: null) => void) | undefined,
  getMessages: vi.fn(),
  createConversation: vi.fn(),
  selectVersion: vi.fn(),
  branchConversation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.params,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/hooks/useSSEStream", () => ({
  useSSEStream: (onDone: (content: string, meta: null) => void) => {
    mocks.onDone = onDone;
    return {
      content: "",
      meta: null,
      isStreaming: false,
      error: null,
      errorDetail: null,
      send: mocks.sendStream,
      reset: mocks.resetStream,
    };
  },
}));

vi.mock("@/lib/api/conversations", () => ({
  getMessages: mocks.getMessages,
  createConversation: mocks.createConversation,
  selectVersion: mocks.selectVersion,
  branchConversation: mocks.branchConversation,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useConversationChat } from "./useConversationChat";

const message = (id: number, role: Message["role"], content: string, changes: Partial<Message> = {}): Message => ({
  id,
  role,
  content,
  meta: null,
  created_at: "2026-10-31T00:00:00Z",
  ...changes,
});

const SAVED: Message[] = [
  message(1, "user", "What is the rent?"),
  message(2, "assistant", "It is $900."),
  message(3, "user", "And the deposit?"),
  message(4, "assistant", "It is $1,800."),
];

const options = () => ({
  docIds: [8],
  onActivity: vi.fn(),
  onResetScope: vi.fn(),
  onQuestionSent: vi.fn(),
});

const openConversation = async (opts = options()) => {
  mocks.params = new URLSearchParams("conv=5");
  mocks.getMessages.mockResolvedValue(SAVED);
  const hook = renderHook(() => useConversationChat(opts));
  await waitFor(() => expect(hook.result.current.messages).toHaveLength(4));
  return { ...hook, opts };
};

beforeEach(() => {
  mocks.params = new URLSearchParams();
  mocks.sendStream.mockReset();
  mocks.resetStream.mockReset();
  mocks.getMessages.mockReset();
  mocks.createConversation.mockReset();
  mocks.selectVersion.mockReset();
  mocks.branchConversation.mockReset();
  mocks.replace.mockReset();
});

describe("useConversationChat", () => {
  it("opens the conversation named in the address", async () => {
    const { result } = await openConversation();

    expect(mocks.getMessages).toHaveBeenCalledWith(5);
    expect(result.current.activeConvId).toBe(5);
    expect(result.current.loadingConversation).toBe(false);
  });

  it("starts a conversation when the first question is sent, then streams the answer", async () => {
    mocks.createConversation.mockResolvedValue({ id: 9 });
    const opts = options();
    const { result } = renderHook(() => useConversationChat(opts));

    await act(() => result.current.send("What is the rent?"));

    expect(mocks.replace).toHaveBeenCalledWith("/dashboard?conv=9");
    expect(mocks.sendStream).toHaveBeenCalledWith(9, "What is the rent?", [8], {});
    expect(result.current.messages.map((m) => [m.role, m.content])).toEqual([["user", "What is the rent?"]]);
    expect(opts.onQuestionSent).toHaveBeenCalled();
  });

  it("does not send an empty question", async () => {
    const { result } = await openConversation();

    await act(() => result.current.send("   "));

    expect(mocks.sendStream).not.toHaveBeenCalled();
  });

  it("edits a question: everything after it leaves the screen and the edit is streamed", async () => {
    const { result } = await openConversation();

    act(() => result.current.edit(3, "What is the deposit amount?"));

    expect(mocks.sendStream).toHaveBeenCalledWith(5, "What is the deposit amount?", [8], { editOf: 3 });
    expect(result.current.messages.map((m) => m.content)).toEqual([
      "What is the rent?",
      "It is $900.",
      "What is the deposit amount?",
    ]);
  });

  it("editing the first question clears the whole conversation but the edit", async () => {
    const { result } = await openConversation();

    act(() => result.current.edit(1, "How much is the rent?"));

    expect(result.current.messages.map((m) => m.content)).toEqual(["How much is the rent?"]);
  });

  it("ignores an edit of a message it does not have", async () => {
    const { result } = await openConversation();

    act(() => result.current.edit(99, "x"));

    expect(mocks.sendStream).not.toHaveBeenCalled();
  });

  it("retries the last answer: the same question is asked again and no second copy of it appears", async () => {
    const { result } = await openConversation();

    act(() => result.current.rewrite());

    expect(mocks.sendStream).toHaveBeenCalledWith(5, "And the deposit?", [8], { retryOf: 4 });
    expect(result.current.messages.map((m) => m.content)).toEqual([
      "What is the rent?",
      "It is $900.",
      "And the deposit?",
    ]);
  });

  it("reloads the conversation from the server when an answer finishes, to get real ids and versions", async () => {
    const { result } = await openConversation();
    const withVersions = SAVED.map((m) => ({ ...m, version: 1, versions: 1, sibling_ids: [m.id] }));
    mocks.getMessages.mockResolvedValue(withVersions);

    act(() => mocks.onDone!("It is $1,800.", null));

    await waitFor(() => expect(result.current.messages[3].sibling_ids).toEqual([4]));
    expect(mocks.getMessages).toHaveBeenCalledTimes(2);
  });

  it("switches to another version using what the server returns", async () => {
    const { result } = await openConversation();
    const other = [message(1, "user", "What is the rent?"), message(7, "assistant", "A retried answer.")];
    mocks.selectVersion.mockResolvedValue(other);

    act(() => result.current.switchVersion(7));

    await waitFor(() => expect(result.current.messages).toEqual(other));
    expect(mocks.selectVersion).toHaveBeenCalledWith(5, 7);
  });

  it("opens the new conversation after branching from an answer", async () => {
    const { result, opts } = await openConversation();
    mocks.branchConversation.mockResolvedValue({ id: 12 });

    await act(() => result.current.branch(2));

    expect(mocks.branchConversation).toHaveBeenCalledWith(5, 2);
    expect(opts.onActivity).toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard?conv=12");
  });

  it("goes back to a blank chat", async () => {
    const { result, opts } = await openConversation();

    act(() => result.current.newChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.activeConvId).toBeNull();
    expect(opts.onResetScope).toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith("/dashboard");
  });
});
