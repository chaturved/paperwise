import { useEffect, useState } from "react";
import { getDocumentFile } from "@/lib/api/documents";
import { apiErrorMessage } from "@/lib/api-error";

interface State {
  url: string | null;
  error: string | null;
}

export function useDocumentFileUrl(docId: number | null) {
  const [state, setState] = useState<State & { forDocId: number | null }>({ url: null, error: null, forDocId: null });

  useEffect(() => {
    if (docId === null) return;
    let cancelled = false;
    getDocumentFile(docId)
      .then((file) => !cancelled && setState({ url: file.url, error: null, forDocId: docId }))
      .catch(
        (err) =>
          !cancelled &&
          setState({ url: null, error: apiErrorMessage(err, "Could not open this document."), forDocId: docId }),
      );
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const current = state.forDocId === docId;
  return { url: current ? state.url : null, error: current ? state.error : null, loading: docId !== null && !current };
}
