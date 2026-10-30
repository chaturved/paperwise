"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Conversation } from "@/types";

interface Props {
  conversations: Conversation[];
  activeId?: number | null;
  onSelect: (id: number) => void;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

export function ConversationList({ conversations, activeId, onSelect, onRename, onDelete }: Props) {
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const submitRename = (id: number) => {
    const title = renameValue.trim();
    setRenamingId(null);
    if (title) onRename(id, title);
  };

  return (
    <section aria-label="Recent conversations" className="flex min-h-0 flex-1 flex-col px-2 pt-8">
      <div className="mb-2 flex items-center justify-between px-4 text-[12px] font-medium text-ink/50">
        <span>Recents</span>
        <span className="tabular-nums">{conversations.length}</span>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto pb-4">
        {conversations.length === 0 ? (
          <p className="px-4 py-2 text-[13px] text-ink/45">No conversations yet</p>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex min-h-10 items-center gap-1 rounded-md pl-4 pr-2 transition-colors ${activeId === conversation.id ? "bg-ink/[0.08]" : "hover:bg-ink/[0.06]"}`}
            >
              {renamingId === conversation.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={() => submitRename(conversation.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitRename(conversation.id);
                    if (event.key === "Escape") setRenamingId(null);
                  }}
                  aria-label="Rename conversation"
                  className="min-w-0 flex-1 border-b border-accent bg-transparent py-1 text-[13px] outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  title={conversation.title}
                  className="min-w-0 flex-1 truncate py-2 text-left text-[13px] text-ink/75 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {conversation.title}
                </button>
              )}
              {renamingId !== conversation.id && (
                <div className="flex shrink-0 items-center sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(conversation.id);
                      setRenameValue(conversation.title);
                    }}
                    aria-label={`Rename ${conversation.title}`}
                    className="rounded p-1 text-ink/45 hover:text-ink"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    aria-label={`Delete ${conversation.title}`}
                    className="rounded p-1 text-ink/45 hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
