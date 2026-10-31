"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ConversationSearchDialog } from "@/components/conversations/conversation-search-dialog";
import { useAccountUsage } from "@/hooks/useAccountUsage";
import { useConversations } from "@/hooks/useConversations";
import type { Conversation } from "@/types";
import { AccountMenu } from "./account-menu";
import { ConversationList } from "./conversation-list";
import { PlanMeter } from "./plan-meter";

const rowClass = (active: boolean) =>
  `flex h-9 w-full items-center gap-3 rounded px-3 text-sm transition hover:bg-ink/[0.05] hover:text-ink ${active ? "bg-ink/[0.08] font-medium text-ink" : "text-ink/80"}`;

interface Props {
  activeConvId?: number | null;
  onConvSelect?: (id: number) => void;
  onConvDelete?: (id: number) => void;
  onNewChat?: () => void;
  onConversationsChange?: (conversations: Conversation[]) => void;
  refreshKey?: number;
}

export default function AppSidebar({ activeConvId, onConvSelect, onConvDelete, onNewChat, onConversationsChange, refreshKey }: Props) {
  const router = useRouter();
  const { conversations, refresh, remove, rename } = useConversations(onConversationsChange);
  const [searchOpen, setSearchOpen] = useState(false);
  const usage = useAccountUsage(refreshKey);
  const pathname = usePathname();
  const onLibraryPage = pathname.startsWith("/library");
  const onNewChatPage = pathname.startsWith("/dashboard") && !activeConvId;

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const handleNewChat = () => {
    if (onNewChat) onNewChat();
    else router.push("/dashboard");
  };

  const handleSelect = (id: number) => {
    if (onConvSelect) onConvSelect(id);
    else router.push(`/dashboard?conv=${id}`);
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      onConvDelete?.(id);
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handleRename = async (id: number, title: string) => {
    try {
      await rename(id, title);
    } catch {
      toast.error("Failed to rename conversation");
    }
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-line bg-rail text-ink">
      <ConversationSearchDialog open={searchOpen} onOpenChange={setSearchOpen} recentConversations={conversations} onSelect={handleSelect} />
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-5">
        <Link href="/dashboard" className="font-display text-[23px] tracking-[-0.0125em]">Paperwise</Link>
        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          aria-label="Search conversations"
          aria-expanded={searchOpen}
          className="mr-7 flex h-8 w-8 items-center justify-center rounded text-ink/60 transition hover:bg-ink/[0.07] hover:text-ink md:mr-0"
        >
          <Search size={17} strokeWidth={1.8} />
        </button>
      </div>

      <nav aria-label="Workspace navigation" className="shrink-0 space-y-1 px-3 pt-1">
        <button
          type="button"
          onClick={handleNewChat}
          aria-current={onNewChatPage ? "page" : undefined}
          className={`${rowClass(onNewChatPage)} text-left`}
        >
          <Plus size={17} strokeWidth={1.7} /> New chat
        </button>
        <Link href="/library" aria-current={onLibraryPage ? "page" : undefined} className={rowClass(onLibraryPage)}>
          <FileText size={17} strokeWidth={1.7} /> Library
          {usage && <span className="ml-auto font-mono text-xs text-muted">{usage.documents.used}</span>}
        </Link>
      </nav>

      <ConversationList conversations={conversations} activeId={activeConvId} onSelect={handleSelect} onRename={handleRename} onDelete={handleDelete} />

      <div className="shrink-0 border-t border-line px-3 pt-3">
        <PlanMeter usage={usage} />
        <AccountMenu />
      </div>
    </aside>
  );
}
