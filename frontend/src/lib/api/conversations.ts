import apiClient from "@/lib/api-client";
import type { Conversation, ConversationSearchResult, Message } from "@/types";

export const getConversations = async (): Promise<Conversation[]> => {
  const res = await apiClient.get("/v1/conversations");
  return res.data;
};

export const searchConversations = async (query: string): Promise<ConversationSearchResult[]> => {
  const res = await apiClient.get("/v1/conversations/search", { params: { q: query } });
  return res.data;
};

export const createConversation = async (title = "New conversation"): Promise<Conversation> => {
  const res = await apiClient.post("/v1/conversations", { title });
  return res.data;
};

export const renameConversation = async (id: number, title: string): Promise<Conversation> => {
  const res = await apiClient.patch(`/v1/conversations/${id}`, { title });
  return res.data;
};

export const deleteConversation = async (id: number): Promise<void> => {
  await apiClient.delete(`/v1/conversations/${id}`);
};

export const getMessages = async (id: number): Promise<Message[]> => {
  const res = await apiClient.get(`/v1/conversations/${id}/messages`);
  return res.data;
};

export const selectVersion = async (id: number, messageId: number): Promise<Message[]> => {
  const res = await apiClient.post(`/v1/conversations/${id}/versions`, { message_id: messageId });
  return res.data;
};

export const branchConversation = async (id: number, messageId: number): Promise<Conversation> => {
  const res = await apiClient.post(`/v1/conversations/${id}/branch`, { message_id: messageId });
  return res.data;
};

export const getFollowUps = async (id: number): Promise<string[]> => {
  const res = await apiClient.post(`/v1/conversations/${id}/follow-ups`);
  return res.data.questions;
};

export const exportAnswerDocx = async (id: number, messageId: number): Promise<Blob> => {
  const res = await apiClient.post(`/v1/conversations/${id}/messages/${messageId}/export`, null, {
    responseType: "blob",
  });
  return res.data;
};
