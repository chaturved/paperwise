import { useEffect, useState } from "react";
import { searchConversations } from "@/lib/api/conversations";
import type { ConversationSearchResult } from "@/types";

export function useConversationSearch(query: string, enabled: boolean) {
  const [results, setResults] = useState<ConversationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!enabled || term.length < 2) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setResults([]);
    setLoading(true);
    setError(false);
    const timer = window.setTimeout(() => {
      searchConversations(term)
        .then((items) => {
          if (!cancelled) {
            setResults(items);
            setError(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setError(true);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, enabled]);

  return { results, loading, error };
}
