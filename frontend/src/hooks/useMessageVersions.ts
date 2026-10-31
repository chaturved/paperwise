"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { branchConversation, selectVersion } from "@/lib/api/conversations";
import type { Message } from "@/types";

interface Options {
  convId: number | null;
  isStreaming: boolean;
  setMessages: (messages: Message[]) => void;
  onBranched: (conversationId: number) => void;
}

export function useMessageVersions({ convId, isStreaming, setMessages, onBranched }: Options) {
  const switchVersion = useCallback(
    (messageId: number) => {
      if (!convId || isStreaming) return;
      selectVersion(convId, messageId)
        .then(setMessages)
        .catch(() => toast.error("Could not switch versions"));
    },
    [convId, isStreaming, setMessages],
  );

  const branch = useCallback(
    async (messageId: number) => {
      if (!convId) return;
      try {
        const created = await branchConversation(convId, messageId);
        onBranched(created.id);
        toast.success("Continuing in a new chat");
      } catch {
        toast.error("Could not start a new chat from here");
      }
    },
    [convId, onBranched],
  );

  return { switchVersion, branch };
}
