import { describe, expect, it } from "vitest";
import { peekAlternativesCache, peekExplainSpecCache, specExplanationKey } from "../services/api";

describe("specExplanationKey", () => {
  it("normalizes label and values", () => {
    expect(specExplanationKey(" RAM ", ["8 GB", "12 GB"])).toBe("ram::8 gb|12 gb");
  });
});

describe("cache peeks", () => {
  it("return null on cold cache", () => {
    expect(peekAlternativesCache("missing-id", [])).toBeNull();
    expect(peekExplainSpecCache("missing-id", "RAM", ["8 GB"])).toBeNull();
  });
});
