import { describe, expect, it } from "vitest";

import type { Conversation } from "@/types";

import { groupByRecency } from "./conversation-groups";

const NOW = new Date(2026, 9, 31, 15, 0);

function conversation(id: number, daysAgo: number): Conversation {
  const updated = new Date(2026, 9, 31 - daysAgo, 9, 0);
  return { id, title: `Chat ${id}`, updated_at: updated.toISOString() } as Conversation;
}

describe("groupByRecency", () => {
  it("labels conversations by how long ago they changed", () => {
    const groups = groupByRecency(
      [conversation(1, 0), conversation(2, 1), conversation(3, 4), conversation(4, 20)],
      NOW,
    );
    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday", "Previous 7 days", "Earlier"]);
  });

  it("puts conversations of the same age in one group, in order", () => {
    const groups = groupByRecency([conversation(1, 0), conversation(2, 0), conversation(3, 9)], NOW);
    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((item) => item.id)).toEqual([1, 2]);
  });

  it("returns nothing for no conversations", () => {
    expect(groupByRecency([], NOW)).toEqual([]);
  });
});
