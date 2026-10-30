"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { matchPassage } from "@/lib/pdf-highlight";
import { loadPdfjs } from "@/lib/pdfjs";

interface Props {
  url: string;
  pageNumber: number;
  passage: string;
  onLoad?: (pageCount: number) => void;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function PdfPageView({ url, pageNumber, passage, onLoad }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    loadPdfjs()
      .then((pdfjs) => pdfjs.getDocument({ url }).promise)
      .then((doc) => {
        loaded = doc;
        if (cancelled) return doc.destroy();
        setPdf(doc);
        onLoad?.(doc.numPages);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [url, onLoad]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!pdf || !canvas || !container || pageNumber < 1 || pageNumber > pdf.numPages) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;

    (async () => {
      const [pdfjs, page] = await Promise.all([loadPdfjs(), pdf.getPage(pageNumber)]);
      const scale = container.clientWidth / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      const ratio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      const render = page.render({ canvas, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
      task = render;
      await render.promise;

      const items = (await page.getTextContent()).items.filter((item): item is TextItem => "str" in item);
      const matched = matchPassage(items.map((item) => item.str), passage);
      const found = [...matched].map((index) => {
        const item = items[index];
        const [, , , , x, y] = pdfjs.Util.transform(viewport.transform, item.transform);
        const height = item.height * scale;
        return { left: x, top: y - height, width: item.width * scale, height };
      });
      if (!cancelled) {
        setSize({ width: viewport.width, height: viewport.height });
        setBoxes(found);
      }
    })().catch((err: { name?: string }) => {
      if (!cancelled && err?.name !== "RenderingCancelledException") setFailed(true);
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, passage]);

  if (failed) return <p className="p-6 text-sm text-ink/60">This page could not be shown. Try opening the document again.</p>;

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative mx-auto bg-white shadow-sm" style={size ? { width: size.width, height: size.height } : undefined}>
        <canvas ref={canvasRef} className="block h-full w-full" />
        {boxes.map((box, i) => (
          <span key={i} className="pointer-events-none absolute rounded-[2px] bg-accent/30 mix-blend-multiply" style={box} />
        ))}
      </div>
    </div>
  );
}
