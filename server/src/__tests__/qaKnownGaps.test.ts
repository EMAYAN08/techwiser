/**
 * Classification bugs found by QA on 2026-10-02, now expected to pass.
 */
import { describe, expect, it } from "vitest";
import { classifyProductTitle } from "../lib/categoryTemplates";
import { formFactorFromTitle } from "../lib/titleEnrich";

describe("known gaps: TV token fires before a more specific device", () => {
  it("does not call a Galaxy Book OLED a television", () => {
    expect(classifyProductTitle("Samsung Galaxy Book4 OLED").deviceType).toBe("laptop");
  });

  it("does not call a Nintendo Switch OLED a television", () => {
    expect(classifyProductTitle("Nintendo Switch OLED").deviceType).toBe("console");
  });

  it("does not call streaming sticks a television", () => {
    expect(classifyProductTitle("Amazon Fire TV Stick 4K").deviceType).toBe("streaming");
    expect(classifyProductTitle("Chromecast with Google TV").deviceType).toBe("streaming");
    expect(classifyProductTitle("Apple TV 4K (3rd generation)").deviceType).toBe("streaming");
  });
});

describe("known gaps: appliance and laptop keywords", () => {
  it("does not treat a lens zoom range as an appliance", () => {
    expect(classifyProductTitle("Sony FE 24-70mm zoom range").deviceType).toBe("camera");
  });

  it("classifies gram, ThinkPad, and XPS the way the mobile client already does", () => {
    expect(classifyProductTitle("LG gram 17").deviceType).toBe("laptop");
    expect(classifyProductTitle("Lenovo ThinkPad X1 Carbon").deviceType).toBe("laptop");
    expect(classifyProductTitle("Dell XPS 14").deviceType).toBe("laptop");
  });
});

describe("model-only titles attach the right template", () => {
  it("maps headphone, soundbar, and camera model names", () => {
    expect(classifyProductTitle("Sony WH-1000XM5").deviceType).toBe("headphones");
    expect(classifyProductTitle("Samsung HW-Q990D").deviceType).toBe("soundbar");
    expect(classifyProductTitle("Sonos Arc").deviceType).toBe("soundbar");
    expect(classifyProductTitle("Canon EOS R6 Mark II").deviceType).toBe("camera");
    expect(classifyProductTitle("DJI Osmo Pocket 3").deviceType).toBe("camera");
  });
});

describe("known gaps: AirPods form factor", () => {
  it("reads plural AirPods as in-ear", () => {
    expect(formFactorFromTitle("true wireless AirPods Pro")).toBe("In-ear");
    expect(formFactorFromTitle("Apple AirPods Pro 2")).toBe("In-ear");
  });
});
