"use client";

import { createContext, useContext, useState } from "react";
import type { Conversation } from "@/types";

interface SidebarCallbacks {
  activeConvId?: number | null;
  onConvSelect?: (id: number) => void;
  onConvDelete?: (id: number) => void;
  onNewChat?: () => void;
  refreshKey?: number;
}

interface AppLayoutContextValue {
  sidebarCallbacks: SidebarCallbacks;
  setSidebarCallbacks: (cb: SidebarCallbacks) => void;
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue>({
  sidebarCallbacks: {},
  setSidebarCallbacks: () => {},
  conversations: [],
  setConversations: () => {},
});

export function useAppLayout() {
  return useContext(AppLayoutContext);
}

export function AppLayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCallbacks, setSidebarCallbacks] = useState<SidebarCallbacks>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  return (
    <AppLayoutContext.Provider value={{ sidebarCallbacks, setSidebarCallbacks, conversations, setConversations }}>
      {children}
    </AppLayoutContext.Provider>
  );
}
