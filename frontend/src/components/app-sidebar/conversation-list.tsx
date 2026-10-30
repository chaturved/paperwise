"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { groupByRecency } from "@/lib/conversation-groups";
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
  const groups = useMemo(() => groupByRecency(conversations), [conversations]);

  const submitRename = (id: number) => {
    const title = renameValue.trim();
    setRenamingId(null);
    if (title) onRename(id, title);
  };

  return (
    <section aria-label="Recent conversations" className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-4">
      {conversations.length === 0 && <p className="px-3 pt-6 text-[13px] text-muted">No conversations yet</p>}
      {groups.map((group) => (
        <div key={group.label}>
          <h2 className="mb-1.5 mt-5 px-3 text-xs font-medium text-muted">{group.label}</h2>
          {group.items.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex min-h-9 items-center gap-1 rounded pl-3 pr-1.5 transition-colors ${activeId === conversation.id ? "bg-ink/[0.08]" : "hover:bg-ink/[0.05]"}`}
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
                  className="min-w-0 flex-1 border-b border-ink bg-transparent py-1 text-sm outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  title={conversation.title}
                  aria-current={activeId === conversation.id ? "true" : undefined}
                  className={`min-w-0 flex-1 truncate py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ink ${activeId === conversation.id ? "font-medium text-ink" : "text-ink/75"}`}
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
                    className="rounded p-1.5 text-ink/50 hover:text-ink"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    aria-label={`Delete ${conversation.title}`}
                    className="rounded p-1.5 text-ink/50 hover:text-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
