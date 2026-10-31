"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageEditor } from "./message-editor";
import { VersionSwitcher, type MessageVersions } from "./version-switcher";

interface Props {
  messageId?: number;
  content: string;
  versions?: MessageVersions;
  busy?: boolean;
  onEdit?: (messageId: number, text: string) => void;
  onSwitch?: (messageId: number) => void;
}

export function UserMessage({ messageId, content, versions, busy, onEdit, onSwitch }: Props) {
  const [editing, setEditing] = useState(false);
  const canEdit = Boolean(onEdit) && messageId !== undefined && !busy;

  if (editing && messageId !== undefined) {
    return (
      <MessageEditor
        initial={content}
        onCancel={() => setEditing(false)}
        onSave={(text) => {
          setEditing(false);
          onEdit?.(messageId, text);
        }}
      />
    );
  }

  return (
    <div className="msg-in group flex flex-col items-end gap-1">
      <p className="max-w-[min(520px,85%)] whitespace-pre-wrap rounded-lg bg-card px-4 py-3 text-base leading-relaxed text-ink">
        {content}
      </p>
      <div className="flex items-center gap-1">
        {versions && onSwitch && <VersionSwitcher versions={versions} onSwitch={onSwitch} disabled={busy} />}
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-label="Edit message"
            onClick={() => setEditing(true)}
            className="w-7 px-0 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          >
            <Pencil size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
