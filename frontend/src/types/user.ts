export interface User {
  id: number;
  email: string;
  full_name: string;
  plan: "free" | "pro";
  avatar_initials: string;
  onboarding_completed: boolean;
}

export interface SignInMethods {
  has_password: boolean;
}

export interface EmailExists {
  exists: boolean;
}

export interface UsageItem {
  used: number;
  limit: number | null;
}

export interface Usage {
  documents: UsageItem;
  queries_24h: UsageItem;
  storage_bytes: UsageItem;
}
