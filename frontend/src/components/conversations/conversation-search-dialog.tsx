"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Search, X } from "lucide-react";
import { useConversationSearch } from "@/hooks/useConversationSearch";
import type { Conversation, ConversationSearchResult } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentConversations: Conversation[];
  onSelect: (id: number) => void;
}

export function ConversationSearchDialog({ open, onOpenChange, recentConversations, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const { results, loading, error } = useConversationSearch(query, open);
  const searching = query.trim().length >= 2;
  const items: ConversationSearchResult[] = searching
    ? results
    : recentConversations.slice(0, 8).map((conversation) => ({ ...conversation, match_excerpt: null }));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) setQuery("");
  };

  const handleSelect = (id: number) => {
    handleOpenChange(false);
    onSelect(id);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="left-1/2 top-[12vh] flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-[620px] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-ink/10 bg-workspace text-ink shadow-2xl sm:top-[18vh]">
        <DialogTitle className="sr-only">Search chats</DialogTitle>
        <div className="flex items-center gap-3 border-b border-ink/10 px-4">
          <Search size={19} className="shrink-0 text-ink/45" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats and messages" aria-label="Search chats and messages"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink/45" />
          <DialogClose className="rounded-md p-1.5 text-ink/50 transition hover:bg-ink/[0.07] hover:text-ink" aria-label="Close search"><X size={17} /></DialogClose>
        </div>
        <div className="thin-scroll min-h-24 overflow-y-auto p-2">
          <p className="px-3 pb-2 pt-2 text-xs font-medium text-ink/45">{searching ? "Search results" : "Recent chats"}</p>
          {loading && <p className="px-3 py-5 text-sm text-ink/50">Searching…</p>}
          {error && <p className="px-3 py-5 text-sm text-danger">Search is unavailable right now.</p>}
          {!loading && !error && items.length === 0 && <p className="px-3 py-5 text-sm text-ink/50">{searching ? "No matching chats" : "No chats yet"}</p>}
          {!loading && !error && items.map((conversation) => (
            <button key={conversation.id} type="button" onClick={() => handleSelect(conversation.id)}
              className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition hover:bg-ink/[0.06] focus-visible:bg-ink/[0.06] focus-visible:outline-none">
              <MessageSquare size={17} className="mt-0.5 shrink-0 text-ink/45" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{conversation.title}</span>
                {conversation.match_excerpt && <span className="mt-1 block truncate text-[12px] text-ink/55">{conversation.match_excerpt}</span>}
              </span>
            </button>
          ))}
        </div>
        <div className="border-t border-ink/10 px-4 py-2 text-[11px] text-ink/40">Press Esc to close</div>
      </DialogContent>
    </Dialog>
  );
}
