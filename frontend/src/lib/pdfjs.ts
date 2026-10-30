import type * as PdfJs from "pdfjs-dist";

let loading: Promise<typeof PdfJs> | null = null;

/** Loads pdf.js on first use, so visitors who never open a source don't download it. */
export function loadPdfjs(): Promise<typeof PdfJs> {
  loading ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return pdfjs;
  });
  return loading;
}
