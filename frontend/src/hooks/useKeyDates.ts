"use client";

import { useEffect, useState } from "react";
import { getKeyDates } from "@/lib/api/documents";
import { apiErrorMessage } from "@/lib/api-error";
import type { KeyDate } from "@/types";

interface KeyDatesState {
  dates: KeyDate[] | null;
  error: string | null;
}

export function useKeyDates(docId: number | null) {
  const [state, setState] = useState<KeyDatesState>({ dates: null, error: null });

  useEffect(() => {
    if (docId === null) return;
    let cancelled = false;
    setState({ dates: null, error: null });
    getKeyDates(docId)
      .then((dates) => !cancelled && setState({ dates, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setState({ dates: null, error: apiErrorMessage(err, "Could not read the dates in this file.") }),
      );
    return () => {
      cancelled = true;
    };
  }, [docId]);

  return { ...state, loading: docId !== null && state.dates === null && state.error === null };
}
