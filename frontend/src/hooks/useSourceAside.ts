"use client";

import { useCallback, useEffect, useState } from "react";
import { citedSources } from "@/lib/citations";
import type { Message, Source } from "@/types";

interface SourceAside {
  messageId: number;
  sources: Source[];
  expanded: number | null;
}

export function useSourceAside(messages: Message[], resetKey: unknown) {
  const [citedMessageId, setCitedMessageId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setCitedMessageId(null);
    setExpanded(null);
  }, [resetKey]);

  const show = useCallback((messageId: number, n: number) => {
    setCitedMessageId(messageId);
    setExpanded(n);
  }, []);
  const toggle = useCallback((n: number) => setExpanded((current) => (current === n ? null : n)), []);

  const withSources = messages.filter(
    (message) => message.role === "assistant" && !message.failed && citedSources(message.meta).length > 0,
  );
  const shown = withSources.find((message) => message.id === citedMessageId) ?? withSources.at(-1);
  const aside: SourceAside | null = shown ? { messageId: shown.id, sources: citedSources(shown.meta), expanded } : null;

  return { aside, show, toggle };
}
