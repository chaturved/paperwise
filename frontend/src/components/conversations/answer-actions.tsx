"use client";

import { useState } from "react";
import { Copy, Download, GitBranch, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setFeedback } from "@/lib/api/analytics";
import { answerToMarkdown, downloadText } from "@/lib/export-answer";
import type { Source } from "@/types";

type Rating = "up" | "down";

interface Props {
  messageId?: number;
  content: string;
  question?: string | null;
  sources: Source[];
  switcher?: React.ReactNode;
  onRewrite?: () => void;
  onBranch?: (messageId: number) => void;
}

export function AnswerActions({ messageId, content, question, sources, switcher, onRewrite, onBranch }: Props) {
  const [rating, setRating] = useState<Rating | null>(null);

  const copy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied!");
  };
  const exportAnswer = () => downloadText("paperwise-answer.md", answerToMarkdown(question ?? null, content, sources));

  const rate = async (value: Rating) => {
    if (!messageId) return;
    const next = rating === value ? null : value;
    setRating(next);
    if (!next) return;
    try {
      await setFeedback(messageId, next);
    } catch {
      setRating(rating);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-1">
      {switcher}
      <Button variant="ghost" size="xs" onClick={copy}>
        <Copy size={14} /> Copy
      </Button>
      <Button variant="ghost" size="xs" onClick={exportAnswer}>
        <Download size={14} /> Export
      </Button>
      {onRewrite && (
        <Button variant="ghost" size="xs" onClick={onRewrite}>
          <RefreshCw size={14} /> Rewrite
        </Button>
      )}
      {onBranch && messageId !== undefined && (
        <Button variant="ghost" size="xs" onClick={() => onBranch(messageId)}>
          <GitBranch size={14} /> New chat from here
        </Button>
      )}
      <span className="flex-1" />
      <RatingButton value="up" rating={rating} onRate={rate} />
      <RatingButton value="down" rating={rating} onRate={rate} />
    </div>
  );
}

function RatingButton({
  value,
  rating,
  onRate,
}: {
  value: Rating;
  rating: Rating | null;
  onRate: (value: Rating) => void;
}) {
  const Icon = value === "up" ? ThumbsUp : ThumbsDown;
  const selected = rating === value;
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => onRate(value)}
      aria-pressed={selected}
      aria-label={value === "up" ? "Helpful" : "Not helpful"}
      className={selected ? "text-ink" : ""}
    >
      <Icon size={14} fill={selected ? "currentColor" : "none"} />
    </Button>
  );
}
