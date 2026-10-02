import { describe, expect, it } from "vitest";
import { cleanQuery, searchQueryFromTitle, similarName } from "../services/barcode/matching";

describe("similarName", () => {
  it("matches when a shared alphanumerics model token is present", () => {
    expect(similarName("Sony WH1000XM5 headphones", "Sony WH1000XM5 Black")).toBe(true);
  });

  it("matches on overlapping significant tokens without model codes", () => {
    expect(similarName("Apple MacBook Pro", "Apple MacBook Pro Silver")).toBe(true);
  });

  it("rejects year mismatches", () => {
    expect(similarName("Sony headphones 2023 edition", "Sony headphones 2024 edition")).toBe(false);
  });

  it("returns false for empty inputs", () => {
    expect(similarName("", "anything")).toBe(false);
  });
});

describe("searchQueryFromTitle / cleanQuery", () => {
  it("prefers the head segment before a dash", () => {
    expect(searchQueryFromTitle("Apple iPhone 16 - Black - Unlocked")).toContain("Apple iPhone 16");
  });

  it("strips pack size noise", () => {
    expect(cleanQuery("Cola 12 pack 355 ml cans")).not.toMatch(/pack/i);
  });
});
