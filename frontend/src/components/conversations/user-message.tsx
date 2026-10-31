"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VersionSwitcher } from "./version-switcher";

interface Props {
  messageId?: number;
  content: string;
  version?: number;
  versions?: number;
  siblingIds?: number[];
  busy?: boolean;
  onEdit?: (messageId: number, text: string) => void;
  onSwitch?: (messageId: number) => void;
}

export function UserMessage({ messageId, content, version = 1, versions = 1, siblingIds = [], busy, onEdit, onSwitch }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const canEdit = Boolean(onEdit) && messageId !== undefined && !busy;
  const changed = draft.trim() !== "" && draft.trim() !== content.trim();

  const startEditing = () => {
    setDraft(content);
    setEditing(true);
  };
  const save = () => {
    if (!changed || messageId === undefined) return;
    setEditing(false);
    onEdit?.(messageId, draft.trim());
  };

  if (editing) {
    return (
      <div className="msg-in flex justify-end">
        <div className="w-full max-w-[min(560px,100%)] space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
            }}
            aria-label="Edit your message"
            autoFocus
            className="h-auto w-full text-base"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={save} disabled={!changed} className="disabled:opacity-60">Save and resend</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-in group flex flex-col items-end gap-1">
      <p className="max-w-[min(520px,85%)] whitespace-pre-wrap rounded-lg bg-card px-4 py-3 text-base leading-relaxed text-ink">{content}</p>
      <div className="flex items-center gap-1">
        {onSwitch && messageId !== undefined && (
          <VersionSwitcher version={version} versions={versions} siblingIds={siblingIds} onSwitch={onSwitch} disabled={busy} />
        )}
        {canEdit && (
          <Button type="button" variant="ghost" size="xs" aria-label="Edit message" onClick={startEditing} className="w-7 px-0 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
            <Pencil size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
