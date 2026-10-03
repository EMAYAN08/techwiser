import { describe, expect, it, vi } from "vitest";
import { readClipboardText, textFromPasteEvent } from "../utils/pasteText";

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

describe("readClipboardText", () => {
  it("prefers URL clipboard entries over plain text", async () => {
    const clipboard = {
      getUrlAsync: vi.fn().mockResolvedValue("  https://www.costco.ca/product.1.html  "),
      getStringAsync: vi.fn().mockResolvedValue("https://should-not-use.example"),
    };
    await expect(readClipboardText(clipboard)).resolves.toBe("https://www.costco.ca/product.1.html");
    expect(clipboard.getStringAsync).not.toHaveBeenCalled();
  });

  it("falls back to plain string when URL is empty", async () => {
    const clipboard = {
      getUrlAsync: vi.fn().mockResolvedValue(null),
      getStringAsync: vi.fn().mockResolvedValue("  https://www.bestbuy.ca/en-ca/product/x/1  "),
    };
    await expect(readClipboardText(clipboard)).resolves.toBe(
      "https://www.bestbuy.ca/en-ca/product/x/1"
    );
  });

  it("works when getUrlAsync is unavailable", async () => {
    const clipboard = {
      getStringAsync: vi.fn().mockResolvedValue("https://www.canadacomputers.com/product/1"),
    };
    await expect(readClipboardText(clipboard)).resolves.toBe(
      "https://www.canadacomputers.com/product/1"
    );
  });

  it("returns empty string when clipboard reads fail", async () => {
    const clipboard = {
      getUrlAsync: vi.fn().mockRejectedValue(new Error("denied")),
      getStringAsync: vi.fn().mockRejectedValue(new Error("denied")),
    };
    await expect(readClipboardText(clipboard)).resolves.toBe("");
  });

  it("trims whitespace-only clipboard values to empty", async () => {
    const clipboard = {
      getUrlAsync: vi.fn().mockResolvedValue("   "),
      getStringAsync: vi.fn().mockResolvedValue("\n\t"),
    };
    await expect(readClipboardText(clipboard)).resolves.toBe("");
  });
});
