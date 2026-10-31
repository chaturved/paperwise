import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export function HistoryLimitNotice({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-10">
      <div className="max-w-[460px] text-center">
        <h2 className="mb-3 font-display text-[32px] font-normal leading-[1.1] tracking-[-0.0125em]">This conversation is outside your history</h2>
        <p className="mb-7 text-[15px] leading-relaxed text-muted">The Free plan keeps 7 days of conversation history, and this chat is older than that. Start a new chat, or see what the other plan includes.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" onClick={onNewChat} size="lg" className="px-6">Start a new chat</Button>
          <Link href="/settings/billing" className={buttonVariants({ variant: "secondary", size: "lg", className: "px-6" })}>See plans</Link>
        </div>
      </div>
    </div>
  );
}
