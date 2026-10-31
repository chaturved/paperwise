"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppLayout } from "@/context/AppLayoutContext";
import { useAttachDocuments } from "@/hooks/useAttachDocuments";
import { useConversationChat } from "@/hooks/useConversationChat";
import { useAnswerExport } from "@/hooks/useAnswerExport";
import { useFollowUps } from "@/hooks/useFollowUps";
import { useSourceAside } from "@/hooks/useSourceAside";
import { useLibrary } from "@/hooks/useLibrary";
import type { LibraryDoc } from "@/types";
import { AddDocumentButton } from "./add-document-button";
import { AIMessage } from "./ai-message";
import { FollowUpSuggestions } from "./follow-up-suggestions";
import { InputBox } from "./input-box";
import { SourcesAside } from "./sources-aside";
import { versionsOf } from "./version-switcher";
import { DashboardWelcome } from "./dashboard-welcome";
import { HistoryLimitNotice } from "./history-limit-notice";
import { UserMessage } from "./user-message";

const validIds = (ids: number[]) => ids.filter((id) => Number.isInteger(id) && id > 0);

function scopeFromParams(params: URLSearchParams): number[] {
  const several = (params.get("docs") ?? "").split(",").filter(Boolean).map(Number);
  return validIds(several.length ? several : [Number(params.get("doc"))]);
}

function scopeLabel(docIds: number[], documents: LibraryDoc[]): string | null {
  if (docIds.length === 0) return null;
  if (docIds.length > 1) return `${docIds.length} documents`;
  return documents.find((document) => document.id === docIds[0])?.name ?? null;
}

function DashboardInner() {
  const params = useSearchParams();
  const { setSidebarCallbacks, conversations } = useAppLayout();

  const [inputValue, setInputValue] = useState("");
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const bumpSidebar = useCallback(() => setSidebarRefresh((value) => value + 1), []);
  const { documents, loaded: libraryLoaded, refresh: refreshLibrary } = useLibrary();
  const { attach: handleAttach, uploading: isUploading } = useAttachDocuments(() => {
    bumpSidebar();
    refreshLibrary();
  });
  const [docIds, setDocIds] = useState<number[]>(() => scopeFromParams(params));
  const scopeName = scopeLabel(docIds, documents);
  const selectDoc = useCallback((id: number | null) => setDocIds(id === null ? [] : [id]), []);
  const resetScope = useCallback(() => setDocIds([]), []);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const clearComposer = useCallback(() => {
    setInputValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, []);

  const chat = useConversationChat({
    docIds,
    onActivity: bumpSidebar,
    onResetScope: resetScope,
    onQuestionSent: clearComposer,
  });
  const { activeConvId, messages, isStreaming, streamingContent } = chat;
  const followUps = useFollowUps(activeConvId, messages, isStreaming);
  const handleSend = useCallback((question?: string) => chat.send(question ?? inputValue), [chat, inputValue]);

  useEffect(() => {
    if (!libraryLoaded || docIds.length === 0) return;
    const known = docIds.filter((id) => documents.some((document) => document.id === id));
    if (known.length !== docIds.length) setDocIds(known);
  }, [libraryLoaded, docIds, documents]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    setSidebarCallbacks({
      activeConvId,
      onConvSelect: chat.select,
      onConvDelete: chat.remove,
      onNewChat: chat.newChat,
      refreshKey: sidebarRefresh,
    });
  }, [activeConvId, sidebarRefresh, setSidebarCallbacks, chat.select, chat.remove, chat.newChat]);

  useEffect(() => () => setSidebarCallbacks({}), [setSidebarCallbacks]);

  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;
  const questionBefore = (index: number): string | null =>
    messages
      .slice(0, index)
      .reverse()
      .find((message) => message.role === "user")?.content ?? null;

  const exportWord = useAnswerExport(activeConvId);
  const sourceAside = useSourceAside(messages, `${activeConvId}:${lastAssistantId}`);

  const inChat = messages.length > 0 || activeConvId !== null;
  const title = inChat
    ? (conversations.find((conversation) => conversation.id === activeConvId)?.title ?? "Conversation")
    : "New chat";

  return (
    <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-workspace text-ink">
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-5 sm:px-10">
        <h1 className={`min-w-0 truncate text-[15px] ${inChat ? "font-medium" : "text-muted"}`}>{title}</h1>
        <AddDocumentButton onAttach={handleAttach} uploading={isUploading} />
      </div>

      {inChat && chat.historyLocked ? (
        <HistoryLimitNotice onNewChat={chat.newChat} />
      ) : inChat ? (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="thin-scroll relative z-10 flex-1 overflow-y-auto px-5 py-8 sm:px-10 sm:py-10">
              <div className="mx-auto w-full max-w-[700px] space-y-9">
                {chat.loadingConversation ? (
                  <p className="text-sm text-muted">Loading conversation…</p>
                ) : (
                  messages.map((msg, index) =>
                    msg.role === "user" ? (
                      <UserMessage
                        key={msg.id}
                        messageId={msg.id}
                        content={msg.content}
                        versions={versionsOf(msg)}
                        busy={isStreaming}
                        onEdit={chat.edit}
                        onSwitch={chat.switchVersion}
                      />
                    ) : (
                      <AIMessage
                        key={msg.id}
                        messageId={msg.id}
                        content={msg.content}
                        meta={msg.meta}
                        timestamp={msg.created_at}
                        question={questionBefore(index)}
                        failed={msg.failed || msg.meta?.failed}
                        onRewrite={msg.id === lastAssistantId && !isStreaming ? chat.rewrite : undefined}
                        onCite={(n) => sourceAside.show(msg.id, n)}
                        versions={versionsOf(msg)}
                        onSwitch={chat.switchVersion}
                        onBranch={isStreaming ? undefined : chat.branch}
                        onExportWord={exportWord}
                      />
                    ),
                  )
                )}
                {isStreaming && (
                  <AIMessage
                    content={streamingContent}
                    meta={chat.streamingMeta}
                    streaming
                    timestamp={new Date().toISOString()}
                  />
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="relative z-10 w-full flex-shrink-0 bg-workspace px-5 pb-5 pt-3 sm:px-10 sm:pb-6">
              <div className="mx-auto max-w-[700px]">
                <FollowUpSuggestions questions={followUps} onPick={handleSend} />
                <InputBox
                  value={inputValue}
                  onChange={setInputValue}
                  onSend={() => handleSend()}
                  isStreaming={isStreaming}
                  isUploading={isUploading}
                  onAttach={handleAttach}
                  textareaRef={textareaRef}
                  documents={documents}
                  docIds={docIds}
                  onSelectDoc={selectDoc}
                  placeholder="Ask a follow-up"
                  scope={scopeName ? `Asking in ${scopeName}` : undefined}
                />
                <p className="mt-2.5 text-center text-xs text-muted">Check sources before relying on an answer.</p>
              </div>
            </div>
          </div>
          {sourceAside.aside && <SourcesAside {...sourceAside.aside} onToggle={sourceAside.toggle} />}
        </div>
      ) : (
        <DashboardWelcome
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isStreaming={isStreaming}
          isUploading={isUploading}
          onAttach={handleAttach}
          textareaRef={textareaRef}
          documents={documents}
          docIds={docIds}
          onSelectDoc={selectDoc}
          scopeName={scopeName}
          conversations={conversations}
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
