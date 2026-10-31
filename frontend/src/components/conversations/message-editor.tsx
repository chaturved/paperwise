"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function MessageEditor({ initial, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initial);
  const text = draft.trim();
  const changed = text !== "" && text !== initial.trim();
  const save = () => {
    if (changed) onSave(text);
  };

  return (
    <div className="msg-in flex justify-end">
      <div className="w-full max-w-[min(560px,100%)] space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
          }}
          aria-label="Edit your message"
          autoFocus
          className="h-auto w-full text-base"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={!changed} className="disabled:opacity-60">
            Save and resend
          </Button>
        </div>
      </div>
    </div>
  );
}
