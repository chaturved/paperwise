import { describe, expect, it } from "vitest";
import { answerToMarkdown } from "./export-answer";

describe("answerToMarkdown", () => {
  it("puts the question first and lists each source with its page", () => {
    const markdown = answerToMarkdown("What is the rent?", "It is $900 [1].", [
      { n: 1, name: "lease.pdf", page: 3, quote: "Rent is  $900\ndue monthly.", icon: "pdf" },
    ]);

    expect(markdown).toBe(
      '## What is the rent?\n\nIt is $900 [1].\n\n### Sources\n\n1. lease.pdf, page 3: "Rent is $900 due monthly."\n',
    );
  });

  it("leaves out the question and the sources when there are none", () => {
    expect(answerToMarkdown(null, "Just this.", [])).toBe("Just this.\n");
  });
});
