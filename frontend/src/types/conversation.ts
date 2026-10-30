export interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationSearchResult extends Conversation {
  match_excerpt: string | null;
}

export interface Source {
  n?: number; // missing on answers saved before sources were numbered
  doc_id?: number;
  name: string;
  page?: number | null;
  quote: string;
  icon: string;
}

export interface Badge {
  label: string;
  icon: string;
}

export interface Meta {
  description: string;
  badges: Badge[];
  sources: Source[];
  cited?: number[];
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  meta: Meta | null;
  created_at: string;
}
