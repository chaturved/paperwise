import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMessageVersions } from "./useMessageVersions";

const mocks = vi.hoisted(() => ({
  selectVersion: vi.fn(),
  branchConversation: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api/conversations", () => ({
  selectVersion: mocks.selectVersion,
  branchConversation: mocks.branchConversation,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }));

const setMessages = vi.fn();
const onBranched = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectVersion.mockResolvedValue([{ id: 9 }]);
  mocks.branchConversation.mockResolvedValue({ id: 42 });
});

const mount = (changes: { convId?: number | null; isStreaming?: boolean } = {}) =>
  renderHook(() => useMessageVersions({ convId: 5, isStreaming: false, setMessages, onBranched, ...changes }));

describe("useMessageVersions", () => {
  it("shows the messages of the version that was picked", async () => {
    const { result } = mount();

    await act(async () => result.current.switchVersion(9));

    expect(mocks.selectVersion).toHaveBeenCalledWith(5, 9);
    expect(setMessages).toHaveBeenCalledWith([{ id: 9 }]);
  });

  it("does not switch while an answer is streaming or without a conversation", async () => {
    const streaming = mount({ isStreaming: true });
    const noConversation = mount({ convId: null });

    await act(async () => streaming.result.current.switchVersion(9));
    await act(async () => noConversation.result.current.switchVersion(9));

    expect(mocks.selectVersion).not.toHaveBeenCalled();
  });

  it("tells the user when switching fails", async () => {
    mocks.selectVersion.mockRejectedValue(new Error("boom"));
    const { result } = mount();

    await act(async () => result.current.switchVersion(9));

    expect(mocks.toastError).toHaveBeenCalledWith("Could not switch versions");
    expect(setMessages).not.toHaveBeenCalled();
  });

  it("opens the new chat after branching", async () => {
    const { result } = mount();

    await act(async () => result.current.branch(9));

    expect(mocks.branchConversation).toHaveBeenCalledWith(5, 9);
    expect(onBranched).toHaveBeenCalledWith(42);
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it("tells the user when branching fails", async () => {
    mocks.branchConversation.mockRejectedValue(new Error("boom"));
    const { result } = mount();

    await act(async () => result.current.branch(9));

    expect(onBranched).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Could not start a new chat from here");
  });
});
