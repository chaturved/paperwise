import type { Source } from "@/types";
import { sourceNumber } from "@/lib/citations";

export const answerToMarkdown = (question: string | null, answer: string, sources: Source[]): string => {
  const lines: string[] = [];
  if (question) lines.push(`## ${question}`, "");
  lines.push(answer.trim());
  if (sources.length > 0) {
    lines.push("", "### Sources", "");
    sources.forEach((source, index) => {
      const page = source.page ? `, page ${source.page}` : "";
      lines.push(
        `${sourceNumber(source, index)}. ${source.name}${page}: "${source.quote.replace(/\s+/g, " ").trim()}"`,
      );
    });
  }
  return lines.join("\n") + "\n";
};

export const downloadText = (filename: string, text: string): void => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
