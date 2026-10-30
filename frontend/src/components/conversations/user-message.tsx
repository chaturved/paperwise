"use client";

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="msg-in flex justify-end">
      <p className="max-w-[min(520px,85%)] whitespace-pre-wrap rounded-lg bg-card px-4 py-3 text-base leading-relaxed text-ink">{content}</p>
    </div>
  );
}
