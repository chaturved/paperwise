import { describe, expect, it } from "vitest";
import type { Meta, Source } from "@/types";
import { CITATION_HREF_PREFIX, citedSources, linkCitations, sourceNumber } from "./citations";

const source = (n?: number): Source => ({ n, name: "lease.pdf", quote: "q", icon: "pdf" });

describe("sourceNumber", () => {
  it("uses the number the server gave, or the position", () => {
    expect(sourceNumber(source(4), 0)).toBe(4);
    expect(sourceNumber(source(), 2)).toBe(3);
  });
});

describe("citedSources", () => {
  const meta = (cited?: number[]): Meta => ({
    description: "",
    badges: [],
    sources: [source(1), source(2), source(3)],
    cited,
  });

  it("keeps only the cited sources", () => {
    expect(citedSources(meta([1, 3])).map((s) => s.n)).toEqual([1, 3]);
  });

  it("keeps every source when nothing says which were cited", () => {
    expect(citedSources(meta())).toHaveLength(3);
  });

  it("has no sources without meta", () => {
    expect(citedSources(null)).toEqual([]);
  });
});

describe("linkCitations", () => {
  const sources = [source(1), source(2)];

  it("turns a marker that matches a source into a link", () => {
    expect(linkCitations("Rent is due [1].", sources)).toBe(`Rent is due [1](${CITATION_HREF_PREFIX}1).`);
  });

  it("drops a marker that matches no source", () => {
    expect(linkCitations("Rent is due [7].", sources)).toBe("Rent is due .");
  });

  it("leaves a markdown link alone", () => {
    expect(linkCitations("See [1](https://example.com)", sources)).toBe("See [1](https://example.com)");
  });
});
