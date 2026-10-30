"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAppLayout } from "@/context/AppLayoutContext";
import { useSSEStream } from "@/hooks/useSSEStream";
import { useAccountUsage } from "@/hooks/useAccountUsage";
import { useAttachDocuments } from "@/hooks/useAttachDocuments";
import { useLibrary } from "@/hooks/useLibrary";
import { historyLimitReached } from "@/lib/api-error";
import { createConversation, getMessages } from "@/lib/api/conversations";
import type { AskMode, Message } from "@/types";
import { AddDocumentButton } from "./add-document-button";
import { AIMessage } from "./ai-message";
import { InputBox } from "./input-box";
import { DashboardWelcome } from "./dashboard-welcome";
import { HistoryLimitNotice } from "./history-limit-notice";
import { UserMessage } from "./user-message";

function DashboardInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { setSidebarCallbacks, conversations } = useAppLayout();

  const [activeConvId, setActiveConvId] = useState<number | null>(() => {
    const id = Number(params.get("conv"));
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  const [messages, setMessages]         = useState<Message[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(Boolean(params.get("conv")));
  const [historyLocked, setHistoryLocked] = useState(false);
  const [inputValue, setInputValue]     = useState("");
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const { attach: handleAttach, uploading: isUploading } = useAttachDocuments(() => setSidebarRefresh((value) => value + 1));
  const usage = useAccountUsage(sidebarRefresh);
  const { documents, loaded: libraryLoaded } = useLibrary();
  const [docId, setDocId] = useState<number | null>(() => {
    const id = Number(params.get("doc"));
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  const scopeName = documents.find((document) => document.id === docId)?.name ?? null;
  const [modeChoice, setModeChoice] = useState<AskMode | null>(null);
  const documentCountForMode = usage?.documents.used ?? null;
  const mode: AskMode = modeChoice ?? ((documentCountForMode ?? 1) > 0 ? "documents" : "general");

  useEffect(() => {
    if (libraryLoaded && docId !== null && !documents.some((document) => document.id === docId)) setDocId(null);
  }, [libraryLoaded, docId, documents]);
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const newConversationIdRef = useRef<number | null>(null);
  const activeConvIdRef = useRef(activeConvId);
  activeConvIdRef.current = activeConvId;
  const [initialQuestion] = useState(() => params.get("q"));

  const onStreamDone = useCallback((content: string, meta: Message["meta"]) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, role: "assistant", content, meta, created_at: new Date().toISOString() },
    ]);
    setSidebarRefresh((v) => v + 1);
  }, []);

  const { content: streamingContent, meta: streamingMeta, isStreaming, error: streamError, send: sendStream, reset: resetStream } = useSSEStream(onStreamDone);

  useEffect(() => { if (streamError) toast.error(streamError); }, [streamError]);

  useEffect(() => {
    const id = Number(params.get("conv"));
    const nextId = Number.isInteger(id) && id > 0 ? id : null;
    if (nextId === activeConvIdRef.current) return;
    resetStream();
    setMessages([]);
    setLoadingConversation(nextId !== null);
    setActiveConvId(nextId);
  }, [params, resetStream]);

  useEffect(() => {
    setHistoryLocked(false);
    if (!activeConvId) {
      setMessages([]);
      setLoadingConversation(false);
      return;
    }
    if (newConversationIdRef.current === activeConvId) {
      newConversationIdRef.current = null;
      setLoadingConversation(false);
      return;
    }
    let cancelled = false;
    getMessages(activeConvId)
      .then((items) => { if (!cancelled) setMessages(items); })
      .catch((err) => {
        if (cancelled) return;
        if (historyLimitReached(err)) setHistoryLocked(true);
        else toast.error("Could not load this conversation");
      })
      .finally(() => { if (!cancelled) setLoadingConversation(false); });
    return () => { cancelled = true; };
  }, [activeConvId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleNewChat = useCallback(() => {
    resetStream();
    setDocId(null);
    setModeChoice(null);
    setActiveConvId(null);
    setMessages([]);
    setLoadingConversation(false);
    router.replace("/dashboard");
  }, [resetStream, router]);

  const handleConvSelect = useCallback((id: number) => {
    if (id === activeConvId) return;
    resetStream();
    setDocId(null);
    setModeChoice(null);
    setMessages([]);
    setLoadingConversation(true);
    setActiveConvId(id);
    router.replace(`/dashboard?conv=${id}`);
  }, [activeConvId, resetStream, router]);

  const handleConvDelete = useCallback((id: number) => {
    if (id === activeConvId) {
      resetStream();
      setActiveConvId(null);
      setMessages([]);
      setLoadingConversation(false);
      router.replace("/dashboard");
    }
  }, [activeConvId, resetStream, router]);

  useEffect(() => {
    setSidebarCallbacks({
      activeConvId,
      onConvSelect: handleConvSelect,
      onConvDelete: handleConvDelete,
      onNewChat: handleNewChat,
      refreshKey: sidebarRefresh,
    });
  }, [activeConvId, sidebarRefresh, setSidebarCallbacks, handleConvSelect, handleNewChat, handleConvDelete]);

  useEffect(() => () => setSidebarCallbacks({}), [setSidebarCallbacks]);

  const handleSend = useCallback(async (question?: string) => {
    const q = (question ?? inputValue).trim();
    if (!q || isStreaming) return;

    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await createConversation();
        convId = conv.id;
        newConversationIdRef.current = conv.id;
        setActiveConvId(conv.id);
        router.replace(`/dashboard?conv=${conv.id}`);
        setSidebarRefresh((v) => v + 1);
      } catch {
        toast.error("Failed to start conversation");
        return;
      }
    }

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: q, meta: null, created_at: new Date().toISOString() },
    ]);
    setInputValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    await sendStream(convId, q, docId, mode === "documents");
  }, [activeConvId, docId, inputValue, isStreaming, mode, router, sendStream]);

  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;
  const hasSentInitialQuestion = useRef(false);

  useEffect(() => {
    if (initialQuestion && !hasSentInitialQuestion.current) {
      hasSentInitialQuestion.current = true;
      router.replace("/dashboard");
      handleSendRef.current(initialQuestion);
    }
  }, [initialQuestion, router]);

  const inChat = messages.length > 0 || activeConvId !== null;
  const documentCount = usage?.documents.used ?? null;
  const title = inChat ? conversations.find((conversation) => conversation.id === activeConvId)?.title ?? "Conversation" : "New chat";

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-workspace text-ink">
      <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-5 sm:px-10">
        <h1 className={`min-w-0 truncate text-[15px] ${inChat ? "font-medium" : "text-muted"}`}>{title}</h1>
        <AddDocumentButton onAttach={handleAttach} uploading={isUploading} />
      </div>

      {inChat && historyLocked ? (
        <HistoryLimitNotice onNewChat={handleNewChat} />
      ) : inChat ? (
        <>
          <div className="thin-scroll relative z-10 flex-1 overflow-y-auto px-5 py-8 sm:px-10 sm:py-10">
            <div className="mx-auto w-full max-w-[700px] space-y-9">
            {loadingConversation ? <p className="text-sm text-muted">Loading conversation…</p> : messages.map((msg) =>
              msg.role === "user"
                ? <UserMessage key={msg.id} content={msg.content} />
                : <AIMessage key={msg.id} messageId={msg.id} content={msg.content} meta={msg.meta} timestamp={msg.created_at} />
            )}
            {isStreaming && (
              <AIMessage content={streamingContent} meta={streamingMeta} streaming timestamp={new Date().toISOString()} />
            )}
            <div ref={chatEndRef} />
            </div>
          </div>

          <div className="relative z-10 w-full flex-shrink-0 bg-workspace px-5 pb-5 pt-3 sm:px-10 sm:pb-6">
            <div className="mx-auto max-w-[700px]">
            <InputBox
              value={inputValue}
              onChange={setInputValue}
              onSend={() => handleSend()}
              isStreaming={isStreaming}
              isUploading={isUploading}
              onAttach={handleAttach}
              textareaRef={textareaRef}
              mode={mode}
              onModeChange={setModeChoice}
              placeholder={mode === "general" ? "Ask anything" : "Ask a follow-up"}
              scope={scopeName ? `Asking in ${scopeName}` : undefined}
              onClearScope={scopeName ? () => setDocId(null) : undefined}
            />
            <p className="mt-2.5 text-center text-xs text-muted">Check sources before relying on an answer.</p>
            </div>
          </div>
        </>
      ) : (
        <DashboardWelcome
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isStreaming={isStreaming}
          isUploading={isUploading}
          onAttach={handleAttach}
          textareaRef={textareaRef}
          documentCount={documentCount}
          scopeName={scopeName}
          onClearScope={() => setDocId(null)}
          mode={mode}
          onModeChange={setModeChoice}
        />
      )}
    </main>
  );
}

export default function DashboardContent() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
