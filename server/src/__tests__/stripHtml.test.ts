import { describe, expect, it } from "vitest";
import { stripHtml } from "../services/scraper/bestbuy";

describe("stripHtml", () => {
  it("strips tags and decodes common entities", () => {
    expect(stripHtml("<p>Hello&nbsp;world &amp; friends&lt;3&gt;</p>")).toBe("Hello world & friends<3>");
  });
});
