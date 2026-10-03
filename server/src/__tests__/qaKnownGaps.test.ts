/**
 * Open classification bugs found by QA on 2026-10-02.
 * `it.fails` stays green while the assertion is still wrong, and goes red once the bug is fixed
 * so the expected behavior can be promoted into the passing suite.
 */
import { describe, expect, it } from "vitest";
import { classifyProductTitle } from "../lib/categoryTemplates";
import { formFactorFromTitle } from "../lib/titleEnrich";

describe("known gaps: TV token fires before a more specific device", () => {
  it.fails("does not call a Galaxy Book OLED a television", () => {
    expect(classifyProductTitle("Samsung Galaxy Book4 OLED").deviceType).toBe("laptop");
  });

  it.fails("does not call a Nintendo Switch OLED a television", () => {
    expect(classifyProductTitle("Nintendo Switch OLED").deviceType).not.toBe("television");
  });

  it.fails("does not call streaming sticks a television", () => {
    expect(classifyProductTitle("Amazon Fire TV Stick 4K").deviceType).toBe("streaming");
    expect(classifyProductTitle("Chromecast with Google TV").deviceType).toBe("streaming");
    expect(classifyProductTitle("Apple TV 4K (3rd generation)").deviceType).toBe("streaming");
  });
});

describe("known gaps: appliance and laptop keywords", () => {
  it.fails("does not treat a lens zoom range as an appliance", () => {
    expect(classifyProductTitle("Sony FE 24-70mm zoom range").deviceType).not.toBe("appliance");
  });

  it.fails("classifies gram, ThinkPad, and XPS the way the mobile client already does", () => {
    expect(classifyProductTitle("LG gram 17").deviceType).toBe("laptop");
    expect(classifyProductTitle("Lenovo ThinkPad X1 Carbon").deviceType).toBe("laptop");
    expect(classifyProductTitle("Dell XPS 14").deviceType).toBe("laptop");
  });
});

describe("known gaps: AirPods form factor", () => {
  it.fails("reads plural AirPods as in-ear", () => {
    expect(formFactorFromTitle("true wireless AirPods Pro")).toBe("In-ear");
    expect(formFactorFromTitle("Apple AirPods Pro 2")).toBe("In-ear");
  });
});
