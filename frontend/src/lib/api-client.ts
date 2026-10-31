import axios from "axios";
import { fetchEventSource, type EventSourceMessage } from "@microsoft/fetch-event-source";
import { isProtectedRoute } from "@/lib/auth-routes";

const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}`,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: { resolve: (value?: unknown) => void; reject: (error: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes("/v1/auth/login") || originalRequest.url?.includes("/v1/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post("/v1/auth/refresh", null);
        processQueue(null);
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        if (isProtectedRoute(window.location.pathname)) window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;

type FetchEventSourceFn = typeof fetchEventSource;

let isSseRefreshing = false;
let sseFailedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

const processSseQueue = (error?: unknown) => {
  sseFailedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  sseFailedQueue = [];
};

export const sseClient: FetchEventSourceFn = (path, init) => {
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`;

  const attempt = async (): Promise<void> => {
    await fetchEventSource(url, {
      ...init,
      headers: init.headers ?? { "Content-Type": "application/json" },
      credentials: init.credentials ?? "include",
      openWhenHidden: init.openWhenHidden ?? true,
      async onopen(res) {
        if (init.onopen) await init.onopen(res);

        if (res.status === 401) {
          if (isSseRefreshing) {
            await new Promise<void>((resolve, reject) => sseFailedQueue.push({ resolve, reject }));
            return attempt();
          }

          isSseRefreshing = true;
          try {
            await apiClient.post("/v1/auth/refresh", null);
            processSseQueue();
            return attempt();
          } catch (err) {
            processSseQueue(err);
            window.location.href = "/login";
            throw err;
          } finally {
            isSseRefreshing = false;
          }
        }

        if (!res.ok && res.status !== 401) {
          throw new Error(`HTTP ${res.status}`);
        }
      },
      onmessage(event: EventSourceMessage) {
        if (init.onmessage) init.onmessage(event);
      },
      onerror(err) {
        if (init.onerror) init.onerror(err);
      },
    });
  };

  return attempt();
};
