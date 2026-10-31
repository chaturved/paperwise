import type { Conversation } from "@/types";

export interface ConversationGroup {
  label: string;
  items: Conversation[];
}

const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function labelFor(updatedAt: string, today: number): string {
  const days = Math.floor((today - startOfDay(new Date(updatedAt))) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  return "Earlier";
}

export function groupByRecency(conversations: Conversation[], now = new Date()): ConversationGroup[] {
  const today = startOfDay(now);
  const groups: ConversationGroup[] = [];
  for (const conversation of conversations) {
    const label = labelFor(conversation.updated_at, today);
    const group = groups.find((existing) => existing.label === label);
    if (group) group.items.push(conversation);
    else groups.push({ label, items: [conversation] });
  }
  return groups;
}
