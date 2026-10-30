"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChartNoAxesCombined, ChevronRight, CreditCard, FileText, LogOut, Pencil, Search, SquarePen, Trash2, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/api/auth";
import { deleteConversation, getConversations, renameConversation } from "@/lib/api/conversations";
import { deleteDocument, getLibrary, uploadFiles } from "@/lib/api/documents";
import type { Conversation, LibraryDoc } from "@/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConversationSearchDialog } from "@/components/conversations/conversation-search-dialog";

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
  const { user, refetchUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [library, setLibrary] = useState<LibraryDoc[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const items = await getConversations();
      setConversations(items);
      onConversationsChange?.(items);
    } catch { /* Keep local navigation available while the API recovers. */ }
  }, [onConversationsChange]);

  const loadLibrary = useCallback(async () => {
    try {
      const data = await getLibrary();
      setLibrary(data.sections);
    } catch { /* Keep local navigation available while the API recovers. */ }
  }, []);

  useEffect(() => { loadConversations(); loadLibrary(); }, [loadConversations, loadLibrary, refreshKey]);

  const handleNewChat = () => {
    if (onNewChat) onNewChat();
    else router.push("/dashboard");
  };

  const handleConvSelect = (id: number) => {
    if (onConvSelect) onConvSelect(id);
    else router.push(`/dashboard?conv=${id}`);
  };

  const handleDeleteConv = async (id: number) => {
    try {
      await deleteConversation(id);
      await loadConversations();
      onConvDelete?.(id);
    } catch { toast.error("Failed to delete conversation"); }
  };

  const handleRenameSubmit = async (id: number) => {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    try {
      await renameConversation(id, title);
      await loadConversations();
    } catch { toast.error("Failed to rename conversation"); }
  };

  const handleUploadDocs = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploadingDocs(true);
    try {
      await uploadFiles(files);
      await loadLibrary();
      toast.success(`Uploaded ${files.length} file(s)`);
    } catch { toast.error("Upload failed"); }
    finally {
      setUploadingDocs(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      await deleteDocument(id);
      await loadLibrary();
    } catch { toast.error("Delete failed"); }
  };

  const handleLogout = async () => {
    try {
      await logout();
      await refetchUser();
      router.push("/login");
    } catch { toast.error("Could not log out. Please try again."); }
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-ink/10 bg-rail text-ink">
      <ConversationSearchDialog open={searchOpen} onOpenChange={setSearchOpen} recentConversations={conversations} onSelect={handleConvSelect} />
      <div className="flex h-[72px] shrink-0 items-center justify-between gap-2 px-5">
        <Link href="/dashboard" className="font-display text-[21px] font-normal tracking-[-0.0125em]">Paperwise</Link>
        <div className="flex items-center gap-1 pr-5 md:pr-0">
          <button type="button" onClick={() => setSearchOpen((open) => !open)} aria-label="Search conversations" aria-expanded={searchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink/55 transition hover:bg-ink/[0.07] hover:text-ink"><Search size={18} strokeWidth={1.8} /></button>
          <span className="hidden md:block"><ThemeToggle /></span>
        </div>
      </div>

      <nav aria-label="Workspace navigation" className="shrink-0 space-y-1 px-2 pt-2">
        <button type="button" onClick={handleNewChat}
          className="flex h-11 w-full items-center gap-3 rounded-md bg-ink/[0.08] px-4 text-left text-[14px] font-medium transition hover:bg-ink/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <SquarePen size={19} strokeWidth={1.8} /> New chat
        </button>
        <button type="button" onClick={() => setLibraryOpen((open) => !open)} aria-expanded={libraryOpen}
          className={`flex h-11 w-full items-center gap-3 rounded-md px-4 text-left text-[14px] text-ink/75 transition hover:bg-ink/[0.06] hover:text-ink ${libraryOpen ? "bg-ink/[0.05]" : ""}`}>
          <FileText size={19} strokeWidth={1.7} /> Library
          <ChevronRight size={15} className={`ml-auto text-ink/40 transition-transform ${libraryOpen ? "rotate-90" : ""}`} />
        </button>
      </nav>

      {libraryOpen && (
        <section aria-label="Your documents" className="shrink-0 px-4 pb-1 pt-3">
          <div className="mb-2 flex items-center justify-between px-2 text-[12px] font-medium text-ink/50"><span>Your files</span><span>{library.length}</span></div>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingDocs}
            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-[13px] font-medium text-accent transition hover:bg-accent/10 disabled:opacity-50">
            {uploadingDocs ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/25 border-t-accent" /> : <Upload size={15} />}
            {uploadingDocs ? "Uploading…" : "Upload a document"}
          </button>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.docx" className="hidden" onChange={handleUploadDocs} />
          <div className="thin-scroll max-h-32 overflow-y-auto">
            {library.length === 0 ? <p className="px-2 py-2 text-xs text-ink/45">No files yet</p> : library.map((document) => (
              <div key={document.id} className="group flex h-9 items-center gap-2 rounded-md px-2 hover:bg-ink/[0.05]">
                <FileText size={14} className="shrink-0 text-ink/45" />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink/75" title={document.name}>{document.name}</span>
                <button type="button" onClick={() => handleDeleteDoc(document.id)} aria-label={`Delete ${document.name}`}
                  className="rounded p-1 text-ink/40 hover:text-red-500 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Recent conversations" className="flex min-h-0 flex-1 flex-col px-2 pt-8">
        <div className="mb-2 flex items-center justify-between px-4 text-[12px] font-medium text-ink/50"><span>Recents</span><span className="tabular-nums">{conversations.length}</span></div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto pb-4">
          {conversations.length === 0 ? <p className="px-4 py-2 text-[13px] text-ink/45">No conversations yet</p> : conversations.map((conversation) => (
            <div key={conversation.id} className={`group flex min-h-10 items-center gap-1 rounded-md pl-4 pr-2 transition-colors ${activeConvId === conversation.id ? "bg-ink/[0.08]" : "hover:bg-ink/[0.06]"}`}>
              {renamingId === conversation.id ? (
                <input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onBlur={() => handleRenameSubmit(conversation.id)}
                  onKeyDown={(event) => { if (event.key === "Enter") handleRenameSubmit(conversation.id); if (event.key === "Escape") setRenamingId(null); }}
                  aria-label="Rename conversation" className="min-w-0 flex-1 border-b border-accent bg-transparent py-1 text-[13px] outline-none" />
              ) : (
                <button type="button" onClick={() => handleConvSelect(conversation.id)} title={conversation.title}
                  className="min-w-0 flex-1 truncate py-2 text-left text-[13px] text-ink/75 focus-visible:outline-2 focus-visible:outline-accent">{conversation.title}</button>
              )}
              {renamingId !== conversation.id && <div className="flex shrink-0 items-center sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <button type="button" onClick={() => { setRenamingId(conversation.id); setRenameValue(conversation.title); }} aria-label={`Rename ${conversation.title}`}
                  className="rounded p-1 text-ink/45 hover:text-ink"><Pencil size={13} /></button>
                <button type="button" onClick={() => handleDeleteConv(conversation.id)} aria-label={`Delete ${conversation.title}`}
                  className="rounded p-1 text-ink/45 hover:text-red-500"><Trash2 size={13} /></button>
              </div>}
            </div>
          ))}
        </div>
      </section>

      <DropdownMenu.Root open={accountOpen} onOpenChange={setAccountOpen}>
        <DropdownMenu.Trigger asChild>
          <button type="button" aria-label={`${user?.full_name || "Account"} menu`} className="flex h-[74px] w-full shrink-0 items-center gap-3 border-t border-ink/10 px-4 text-left transition hover:bg-ink/[0.05] data-[state=open]:bg-ink/[0.06]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink text-[11px] font-semibold text-bg">{user?.avatar_initials || user?.full_name?.slice(0, 2).toUpperCase() || "PW"}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{user?.full_name || "Account"}</span><span className="block text-[11px] text-ink/50">{user?.plan === "pro" ? "Pro" : "Free"}</span></span>
            <ChevronRight size={16} className={`text-ink/40 transition-transform ${accountOpen ? "-rotate-90" : ""}`} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content side="top" align="start" sideOffset={10} collisionPadding={12}
            className="z-[100] w-[288px] max-w-[calc(100vw-24px)] rounded-lg border border-ink/10 bg-card p-2 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.18)] outline-none dark:shadow-black/50">
            <div className="flex items-center gap-3 rounded-md bg-ink/[0.04] px-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-[11px] font-semibold text-bg">{user?.avatar_initials || user?.full_name?.slice(0, 2).toUpperCase() || "PW"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{user?.full_name || "Account"}</span><span className="block truncate text-[11px] text-ink/50">{user?.email}</span></span>
            </div>
            <DropdownMenu.Label className="px-3 pb-1 pt-3 text-[11px] font-medium text-ink/45">Account</DropdownMenu.Label>
            <DropdownMenu.Item asChild><Link href="/settings/profile" className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-[13px] outline-none data-[highlighted]:bg-ink/[0.07]"><UserRound size={17} className="text-ink/60" /> Profile</Link></DropdownMenu.Item>
            <DropdownMenu.Item asChild><Link href="/settings/usage" className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-[13px] outline-none data-[highlighted]:bg-ink/[0.07]"><ChartNoAxesCombined size={17} className="text-ink/60" /> Usage &amp; analytics</Link></DropdownMenu.Item>
            <DropdownMenu.Item asChild><Link href="/settings/billing" className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-[13px] outline-none data-[highlighted]:bg-ink/[0.07]"><CreditCard size={17} className="text-ink/60" /> Plan &amp; billing</Link></DropdownMenu.Item>
            <DropdownMenu.Separator className="my-2 h-px bg-ink/10" />
            <DropdownMenu.Item onSelect={handleLogout} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-[13px] outline-none data-[highlighted]:bg-ink/[0.07]"><LogOut size={17} className="text-ink/60" /> Log out</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </aside>
  );
}
