"use client";

import { useEffect, useRef, useState } from "react";
import { getFollowUps } from "@/lib/api/conversations";
import type { Message } from "@/types";

export function useFollowUps(convId: number | null, messages: Message[], isStreaming: boolean): string[] {
  const [questions, setQuestions] = useState<string[]>([]);
  const awaitingAnswer = useRef(false);

  useEffect(() => {
    awaitingAnswer.current = false;
    setQuestions([]);
  }, [convId]);

  useEffect(() => {
    if (isStreaming) {
      awaitingAnswer.current = true;
      setQuestions([]);
      return;
    }
    const last = messages.at(-1);
    if (!awaitingAnswer.current || !convId || last?.role !== "assistant") return;
    awaitingAnswer.current = false;
    if (last.failed) return;

    let cancelled = false;
    getFollowUps(convId)
      .then((items) => {
        if (!cancelled) setQuestions(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [convId, messages, isStreaming]);

  return questions;
}
