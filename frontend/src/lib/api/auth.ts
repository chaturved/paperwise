import apiClient from "@/lib/api-client";
import type { EmailExists, MessageResponse, SignInMethods, User } from "@/types";

export const getMe = async (): Promise<User> => {
  const res = await apiClient.get("/v1/auth/me");
  return res.data;
};

export const login = async (email: string, password: string): Promise<User> => {
  const params = new URLSearchParams({ username: email, password });
  const res = await apiClient.post("/v1/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data.user;
};

export const getSignInMethods = async (email: string): Promise<SignInMethods> => {
  const res = await apiClient.post("/v1/auth/methods", { email });
  return res.data;
};

export const emailExists = async (email: string): Promise<EmailExists> => {
  const res = await apiClient.post("/v1/auth/email-exists", { email });
  return res.data;
};

export const signup = async (email: string, password: string, full_name: string): Promise<User> => {
  const res = await apiClient.post("/v1/auth/signup", { email, password, full_name });
  return res.data.user;
};

export const logout = async (): Promise<void> => {
  await apiClient.post("/v1/auth/logout");
};

export const forgotPassword = async (email: string): Promise<MessageResponse> => {
  const res = await apiClient.post("/v1/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async (token: string, new_password: string): Promise<MessageResponse> => {
  const res = await apiClient.post("/v1/auth/reset-password", { token, new_password });
  return res.data;
};

export const sendMagicLink = async (email: string): Promise<MessageResponse> => {
  const res = await apiClient.post("/v1/auth/magic-link", { email });
  return res.data;
};
