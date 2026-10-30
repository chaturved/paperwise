import { useCallback, useEffect, useState } from "react";
import { deleteDocument, getLibrary, retryDocument } from "@/lib/api/documents";
import type { LibraryDoc } from "@/types";

const POLL_MS = 2000;

export function useLibrary() {
  const [documents, setDocuments] = useState<LibraryDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getLibrary();
      setDocuments(data.sections);
    } catch {
      /* Keep the last list while the API recovers. */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasPending = documents.some((d) => d.status === "uploading" || d.status === "processing");
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [hasPending, refresh]);

  const remove = async (id: number) => {
    await deleteDocument(id);
    await refresh();
  };

  const retry = async (id: number) => {
    await retryDocument(id);
    await refresh();
  };

  return { documents, loaded, refresh, remove, retry };
}
