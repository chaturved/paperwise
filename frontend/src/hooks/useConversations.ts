import { useCallback, useState } from "react";
import { deleteConversation, getConversations, renameConversation } from "@/lib/api/conversations";
import type { Conversation } from "@/types";

/** The user's conversations. `onChange` hears about every fresh list, so other parts of the screen can follow along. */
export function useConversations(onChange?: (conversations: Conversation[]) => void) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const refresh = useCallback(async () => {
    try {
      const items = await getConversations();
      setConversations(items);
      onChange?.(items);
    } catch {
      /* Keep local navigation available while the API recovers. */
    }
  }, [onChange]);

  const remove = async (id: number) => {
    await deleteConversation(id);
    await refresh();
  };

  const rename = async (id: number, title: string) => {
    await renameConversation(id, title);
    await refresh();
  };

  return { conversations, refresh, remove, rename };
}
