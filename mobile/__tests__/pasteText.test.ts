import { describe, expect, it } from "vitest";
import { textFromPasteEvent } from "../utils/pasteText";

describe("textFromPasteEvent", () => {
  it("trims pasted urls", () => {
    expect(
      textFromPasteEvent({
        type: "text",
        text: "  https://www.bestbuy.ca/en-ca/product/example/123  ",
      })
    ).toBe("https://www.bestbuy.ca/en-ca/product/example/123");
  });

  it("ignores image pastes and empty payloads", () => {
    expect(textFromPasteEvent({ type: "image" })).toBe("");
    expect(textFromPasteEvent({ type: "text", text: "   " })).toBe("");
    expect(textFromPasteEvent(null)).toBe("");
    expect(textFromPasteEvent(undefined)).toBe("");
  });
});
