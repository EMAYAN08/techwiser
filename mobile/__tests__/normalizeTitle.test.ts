import { describe, expect, it } from "vitest";
import { normalizeTitle } from "../components/comparison/utils";

describe("normalizeTitle", () => {
  it("strips filler words and caps at 3 words", () => {
    expect(normalizeTitle("Apple iPhone 16 5G Unlocked Smartphone Black")).toBe("Apple iPhone 16");
  });

  it("keeps short titles intact", () => {
    expect(normalizeTitle("Pixel 9a")).toBe("Pixel 9a");
  });
});
