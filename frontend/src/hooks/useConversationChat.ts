"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSSEStream } from "@/hooks/useSSEStream";
import { historyLimitReached } from "@/lib/api-error";
import { createConversation, getMessages } from "@/lib/api/conversations";
import type { Message } from "@/types";

interface Options {
  docIds: number[];
  onActivity: () => void;
  onResetScope: () => void;
  onQuestionSent: () => void;
}

const conversationIdFrom = (value: string | null): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export function useConversationChat({ docIds, onActivity, onResetScope, onQuestionSent }: Options) {
  const params = useSearchParams();
  const router = useRouter();

  const [activeConvId, setActiveConvId] = useState<number | null>(() => conversationIdFrom(params.get("conv")));
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(Boolean(params.get("conv")));
  const [historyLocked, setHistoryLocked] = useState(false);
  const [initialQuestion] = useState(() => params.get("q"));
  const newConversationIdRef = useRef<number | null>(null);
  const activeConvIdRef = useRef(activeConvId);
  activeConvIdRef.current = activeConvId;

  const onStreamDone = useCallback((content: string, meta: Message["meta"]) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, role: "assistant", content, meta, created_at: new Date().toISOString() },
    ]);
    onActivity();
  }, [onActivity]);

  const { content: streamingContent, meta: streamingMeta, isStreaming, error: streamError, errorDetail: streamErrorDetail, send: sendStream, reset: resetStream } = useSSEStream(onStreamDone);

  useEffect(() => {
    if (!streamError) return;
    const detail = streamErrorDetail ?? "Something went wrong while answering. Please try again.";
    toast.error(streamError, { description: detail });
    setMessages((prev) => [...prev, { id: Date.now() + 2, role: "assistant", content: detail, meta: null, created_at: new Date().toISOString(), failed: true }]);
  }, [streamError, streamErrorDetail]);

  useEffect(() => {
    const nextId = conversationIdFrom(params.get("conv"));
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

  const newChat = useCallback(() => {
    resetStream();
    onResetScope();
    setActiveConvId(null);
    setMessages([]);
    setLoadingConversation(false);
    router.replace("/dashboard");
  }, [resetStream, onResetScope, router]);

  const select = useCallback((id: number) => {
    if (id === activeConvId) return;
    resetStream();
    onResetScope();
    setMessages([]);
    setLoadingConversation(true);
    setActiveConvId(id);
    router.replace(`/dashboard?conv=${id}`);
  }, [activeConvId, resetStream, onResetScope, router]);

  const remove = useCallback((id: number) => {
    if (id !== activeConvId) return;
    resetStream();
    setActiveConvId(null);
    setMessages([]);
    setLoadingConversation(false);
    router.replace("/dashboard");
  }, [activeConvId, resetStream, router]);

  const send = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text || isStreaming) return;

    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await createConversation();
        convId = conv.id;
        newConversationIdRef.current = conv.id;
        setActiveConvId(conv.id);
        router.replace(`/dashboard?conv=${conv.id}`);
        onActivity();
      } catch {
        toast.error("Failed to start conversation");
        return;
      }
    }

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: text, meta: null, created_at: new Date().toISOString() },
    ]);
    onQuestionSent();

    await sendStream(convId, text, docIds);
  }, [activeConvId, docIds, isStreaming, onActivity, onQuestionSent, router, sendStream]);

  const rewrite = useCallback(() => {
    const last = [...messages].reverse().find((message) => message.role === "user");
    if (last) send(last.content);
  }, [messages, send]);

  const sendRef = useRef(send);
  sendRef.current = send;
  const hasSentInitialQuestion = useRef(false);

  useEffect(() => {
    if (initialQuestion && !hasSentInitialQuestion.current) {
      hasSentInitialQuestion.current = true;
      router.replace("/dashboard");
      sendRef.current(initialQuestion);
    }
  }, [initialQuestion, router]);

  return {
    activeConvId,
    messages,
    loadingConversation,
    historyLocked,
    isStreaming,
    streamingContent,
    streamingMeta,
    send,
    rewrite,
    newChat,
    select,
    remove,
  };
}
