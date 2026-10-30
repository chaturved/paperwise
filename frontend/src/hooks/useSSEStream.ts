"use client";

import { useCallback, useRef, useState } from "react";
import { sseClient } from "@/lib/api-client";
import type { Meta } from "@/types";

interface StreamState {
  content: string;
  meta: Meta | null;
  isStreaming: boolean;
  error: string | null;
}

const INITIAL: StreamState = { content: "", meta: null, isStreaming: false, error: null };

export function useSSEStream(onDone?: (content: string, meta: Meta | null) => void) {
  const [state, setState] = useState<StreamState>(INITIAL);
  const accumulated = useRef({ content: "", meta: null as Meta | null });
  const controllerRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (conversationId: number, question: string) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      accumulated.current = { content: "", meta: null };
      setState({ content: "", meta: null, isStreaming: true, error: null });

      try {
        await sseClient(`/v1/conversations/${conversationId}/ask`, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, filters: null, top_k: 5 }),
          onmessage(ev) {
            if (controllerRef.current !== controller) return;
            if (ev.data === "[DONE]") {
              controllerRef.current = null;
              controller.abort();
              setState((prev) => ({ ...prev, isStreaming: false }));
              onDone?.(accumulated.current.content, accumulated.current.meta);
              return;
            }
            if (ev.event === "error") {
              controllerRef.current = null;
              controller.abort();
              setState((prev) => ({ ...prev, isStreaming: false, error: "AI response failed" }));
              return;
            }
            try {
              const parsed = JSON.parse(ev.data);
              const meta: Meta | null = parsed.cited && accumulated.current.meta
                ? { ...accumulated.current.meta, cited: parsed.cited }
                : (parsed.meta ?? accumulated.current.meta);
              accumulated.current = {
                meta,
                content: parsed.token ? accumulated.current.content + parsed.token : accumulated.current.content,
              };
              setState((prev) => ({ ...prev, meta: accumulated.current.meta, content: accumulated.current.content }));
            } catch {
              /* ignore parse errors */
            }
          },
          onerror(err) {
            if (controllerRef.current !== controller) return;
            controllerRef.current = null;
            controller.abort();
            const rateLimited = err instanceof Error && err.message === "HTTP 429";
            setState((prev) => ({ ...prev, isStreaming: false, error: rateLimited ? "You're asking too fast. Please wait a moment." : "AI response failed" }));
          },
        });
      } catch {
        if (controllerRef.current === controller) {
          setState((prev) => ({ ...prev, isStreaming: false, error: "AI response failed" }));
        }
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [onDone]
  );

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    accumulated.current = { content: "", meta: null };
    setState(INITIAL);
  }, []);

  return { ...state, send, reset };
}
