import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/types";

export interface MessageVersions {
  version: number;
  count: number;
  siblingIds: number[];
}

export function versionsOf(message: Message): MessageVersions | undefined {
  const { version = 1, versions = 1, sibling_ids: siblingIds = [] } = message;
  return versions > 1 && siblingIds.length === versions ? { version, count: versions, siblingIds } : undefined;
}

interface Props {
  versions: MessageVersions;
  onSwitch: (messageId: number) => void;
  disabled?: boolean;
}

export function VersionSwitcher({ versions, onSwitch, disabled }: Props) {
  const { version, count, siblingIds } = versions;
  const go = (offset: number) => onSwitch(siblingIds[version - 1 + offset]);

  return (
    <div role="group" aria-label="Versions" className="flex items-center text-muted">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-label="Previous version"
        disabled={disabled || version === 1}
        onClick={() => go(-1)}
        className="w-6 px-0 disabled:opacity-40"
      >
        <ChevronLeft size={15} />
      </Button>
      <span className="font-mono text-xs tabular-nums" aria-live="polite">
        {version}/{count}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-label="Next version"
        disabled={disabled || version === count}
        onClick={() => go(1)}
        className="w-6 px-0 disabled:opacity-40"
      >
        <ChevronRight size={15} />
      </Button>
    </div>
  );
}
