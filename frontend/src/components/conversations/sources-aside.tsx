import type { Source } from "@/types";
import { SourcesPanel } from "./sources-panel";

interface Props {
  messageId: number;
  sources: Source[];
  expanded: number | null;
  onToggle: (n: number) => void;
}

export function SourcesAside({ messageId, sources, expanded, onToggle }: Props) {
  return (
    <aside aria-label="Sources for this answer" className="thin-scroll hidden w-[360px] shrink-0 overflow-y-auto border-l border-line px-6 py-8 xl:block">
      <SourcesPanel messageKey={`aside-${messageId}`} sources={sources} expanded={expanded} onToggle={onToggle} className="mt-0 border-0 pt-0" />
    </aside>
  );
}
