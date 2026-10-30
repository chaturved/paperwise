"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Search, SquarePen } from "lucide-react";
import { toast } from "sonner";
import { ConversationSearchDialog } from "@/components/conversations/conversation-search-dialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useConversations } from "@/hooks/useConversations";
import type { Conversation } from "@/types";
import { AccountMenu } from "./account-menu";
import { ConversationList } from "./conversation-list";
import { LibrarySection } from "./library-section";

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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-ink/10 bg-rail text-ink">
      <ConversationSearchDialog open={searchOpen} onOpenChange={setSearchOpen} recentConversations={conversations} onSelect={handleSelect} />
      <div className="flex h-[72px] shrink-0 items-center justify-between gap-2 px-5">
        <Link href="/dashboard" className="font-display text-[21px] font-normal tracking-[-0.0125em]">Paperwise</Link>
        <div className="flex items-center gap-1 pr-5 md:pr-0">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="Search conversations"
            aria-expanded={searchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink/55 transition hover:bg-ink/[0.07] hover:text-ink"
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
          <span className="hidden md:block"><ThemeToggle /></span>
        </div>
      </div>

      <nav aria-label="Workspace navigation" className="shrink-0 space-y-1 px-2 pt-2">
        <button
          type="button"
          onClick={handleNewChat}
          className="flex h-11 w-full items-center gap-3 rounded-md bg-ink/[0.08] px-4 text-left text-[14px] font-medium transition hover:bg-ink/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <SquarePen size={19} strokeWidth={1.8} /> New chat
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen((open) => !open)}
          aria-expanded={libraryOpen}
          className={`flex h-11 w-full items-center gap-3 rounded-md px-4 text-left text-[14px] text-ink/75 transition hover:bg-ink/[0.06] hover:text-ink ${libraryOpen ? "bg-ink/[0.05]" : ""}`}
        >
          <FileText size={19} strokeWidth={1.7} /> Library
          <ChevronRight size={15} className={`ml-auto text-ink/40 transition-transform ${libraryOpen ? "rotate-90" : ""}`} />
        </button>
      </nav>

      {libraryOpen && <LibrarySection refreshKey={refreshKey} />}

      <ConversationList conversations={conversations} activeId={activeConvId} onSelect={handleSelect} onRename={handleRename} onDelete={handleDelete} />

      <AccountMenu />
    </aside>
  );
}
