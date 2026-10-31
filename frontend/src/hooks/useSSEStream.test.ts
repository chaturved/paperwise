import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Handlers = { onmessage: (event: { data: string; event?: string }) => void; onerror: (error: unknown) => void };

const stream = vi.hoisted(() => ({
  handlers: undefined as Handlers | undefined,
  options: undefined as { body: string; signal: AbortSignal } | undefined,
  path: "",
  finish: undefined as (() => void) | undefined,
}));

vi.mock("@/lib/api-client", () => ({
  sseClient: (path: string, init: Handlers & { body: string; signal: AbortSignal }) => {
    stream.path = path;
    stream.handlers = init;
    stream.options = init;
    return new Promise<void>((resolve) => {
      stream.finish = resolve;
    });
  },
}));

import { useSSEStream } from "./useSSEStream";

const emit = (data: string, event?: string) => act(() => stream.handlers!.onmessage({ data, event }));
const json = (payload: unknown) => JSON.stringify(payload);

beforeEach(() => {
  stream.handlers = undefined;
  stream.options = undefined;
});

describe("useSSEStream", () => {
  it("builds the answer from the meta, the tokens and the cited sources", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useSSEStream(onDone));

    act(() => {
      void result.current.send(3, "What is the rent?", [8]);
    });
    expect(result.current.isStreaming).toBe(true);
    expect(stream.path).toBe("/v1/conversations/3/ask");

    emit(json({ meta: { description: "", badges: [], sources: [{ n: 1, name: "a.pdf", quote: "q", icon: "pdf" }] } }));
    emit(json({ token: "Rent is " }));
    emit(json({ token: "$900 [1]." }));
    emit(json({ cited: [1] }));
    expect(result.current.content).toBe("Rent is $900 [1].");

    emit("[DONE]");

    expect(result.current.isStreaming).toBe(false);
    expect(onDone).toHaveBeenCalledTimes(1);
    const [content, meta] = onDone.mock.calls[0];
    expect(content).toBe("Rent is $900 [1].");
    expect(meta.cited).toEqual([1]);
  });

  it("sends the question, the chosen documents and no edit or retry by default", () => {
    const { result } = renderHook(() => useSSEStream());

    act(() => {
      void result.current.send(3, "q", [8, 9]);
    });

    expect(JSON.parse(stream.options!.body)).toEqual({
      question: "q",
      filters: { doc_ids: [8, 9] },
      top_k: 5,
      edit_of: null,
      retry_of: null,
    });
  });

  it("asks to edit a question or retry an answer when told to", () => {
    const { result } = renderHook(() => useSSEStream());

    act(() => {
      void result.current.send(3, "new wording", [], { editOf: 12 });
    });
    expect(JSON.parse(stream.options!.body)).toMatchObject({ filters: null, edit_of: 12, retry_of: null });

    act(() => {
      void result.current.send(3, "same question", [], { retryOf: 15 });
    });
    expect(JSON.parse(stream.options!.body)).toMatchObject({ edit_of: null, retry_of: 15 });
  });

  it("reports why an answer failed, and does not call onDone", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useSSEStream(onDone));

    act(() => {
      void result.current.send(3, "q");
    });
    emit(json({ message: "You have reached the limit." }), "error");

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBe("AI response failed");
    expect(result.current.errorDetail).toBe("You have reached the limit.");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("tells the user to slow down when the server answers 429", () => {
    const { result } = renderHook(() => useSSEStream());

    act(() => {
      void result.current.send(3, "q");
    });
    act(() => stream.handlers!.onerror(new Error("HTTP 429")));

    expect(result.current.errorDetail).toBe("You're asking too fast. Please wait a moment.");
  });

  it("starts clean after a reset", () => {
    const { result } = renderHook(() => useSSEStream());

    act(() => {
      void result.current.send(3, "q");
    });
    emit(json({ token: "partial" }));
    act(() => result.current.reset());

    expect(result.current.content).toBe("");
    expect(result.current.isStreaming).toBe(false);
    expect(stream.options!.signal.aborted).toBe(true);
  });
});
