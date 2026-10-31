"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/download";
import { exportAnswerDocx } from "@/lib/api/conversations";

export function useAnswerExport(convId: number | null) {
  return useCallback(
    async (messageId: number) => {
      if (!convId) return;
      try {
        downloadBlob("paperwise-answer.docx", await exportAnswerDocx(convId, messageId));
      } catch {
        toast.error("Could not export this answer");
      }
    },
    [convId],
  );
}
