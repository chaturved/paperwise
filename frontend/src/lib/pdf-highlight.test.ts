import { describe, expect, it } from "vitest";

import { matchPassage } from "./pdf-highlight";

describe("matchPassage", () => {
  it("finds the text items that hold the passage", () => {
    const items = ["Payment is due", " within 30 days", " of the invoice.", "Unrelated footer"];
    expect(matchPassage(items, "Payment is due within 30 days of the invoice.")).toEqual(new Set([0, 1, 2]));
  });

  it("ignores case, spacing and punctuation", () => {
    expect(matchPassage(["Late  fees: 5%"], "late fees 5")).toEqual(new Set([0]));
  });

  it("matches a long passage by its opening and closing when the middle differs", () => {
    const opening = "The supplier shall deliver the goods to the buyer at its own cost";
    const closing = "and risk in the goods passes to the buyer on delivery";
    const items = [`${opening} at the agreed site`, `${closing}.`, "Footer"];
    const passage = `${opening} somewhere else entirely ${closing}`;
    expect(matchPassage(items, passage)).toEqual(new Set([0, 1]));
  });

  it("returns nothing when the passage is absent or empty", () => {
    expect(matchPassage(["Hello world"], "Goodbye moon over the water tonight")).toEqual(new Set());
    expect(matchPassage(["Hello world"], "  ... ")).toEqual(new Set());
  });
});
