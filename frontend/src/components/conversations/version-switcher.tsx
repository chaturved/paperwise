import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  version: number;
  versions: number;
  siblingIds: number[];
  onSwitch: (messageId: number) => void;
  disabled?: boolean;
}

export function VersionSwitcher({ version, versions, siblingIds, onSwitch, disabled }: Props) {
  if (versions < 2 || siblingIds.length !== versions) return null;
  const go = (offset: number) => onSwitch(siblingIds[version - 1 + offset]);

  return (
    <div role="group" aria-label="Versions" className="flex items-center text-muted">
      <Button type="button" variant="ghost" size="xs" aria-label="Previous version" disabled={disabled || version === 1} onClick={() => go(-1)} className="w-6 px-0 disabled:opacity-40"><ChevronLeft size={15} /></Button>
      <span className="font-mono text-xs tabular-nums" aria-live="polite">{version}/{versions}</span>
      <Button type="button" variant="ghost" size="xs" aria-label="Next version" disabled={disabled || version === versions} onClick={() => go(1)} className="w-6 px-0 disabled:opacity-40"><ChevronRight size={15} /></Button>
    </div>
  );
}
