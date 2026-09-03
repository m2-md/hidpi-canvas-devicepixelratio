import { describe, it, expect } from "vitest";
import {
  deviceSize,
  cssToDevice,
  deviceToCss,
  alignHalfPixel,
  pixelRatio,
} from "../src/scale";

describe("deviceSize", () => {
  it("keeps CSS size unchanged when dpr=1", () => {
    expect(deviceSize(300, 150, 1)).toEqual({ w: 300, h: 150 });
  });

  it("doubles each edge when dpr=2", () => {
    expect(deviceSize(300, 150, 2)).toEqual({ w: 600, h: 300 });
  });

  it("triples each edge when dpr=3", () => {
    expect(deviceSize(400, 300, 3)).toEqual({ w: 1200, h: 900 });
  });

  it("rounds fractional CSS size to integer", () => {
    // 300.4 * 1.5 = 450.6 → 451 ; 150.2 * 1.5 = 225.3 → 225
    expect(deviceSize(300.4, 150.2, 1.5)).toEqual({ w: 451, h: 225 });
  });
});

describe("cssToDevice / deviceToCss", () => {
  it("cssToDevice multiplies by ratio", () => {
    expect(cssToDevice(100, 2)).toBe(200);
    expect(cssToDevice(100, 3)).toBe(300);
  });

  it("deviceToCss inverts ratio", () => {
    expect(deviceToCss(200, 2)).toBe(100);
  });

  it("round-trip returns to initial value", () => {
    for (const dpr of [1, 1.5, 2, 3]) {
      const px = 137;
      expect(deviceToCss(cssToDevice(px, dpr), dpr)).toBeCloseTo(px);
    }
  });
});

describe("alignHalfPixel", () => {
  it("centers integer to half pixel", () => {
    expect(alignHalfPixel(40)).toBe(40.5);
    expect(alignHalfPixel(0)).toBe(0.5);
  });

  it("does not modify values that are already .5", () => {
    expect(alignHalfPixel(40.5)).toBe(40.5);
  });

  it("floors fractional value and centers", () => {
    expect(alignHalfPixel(40.2)).toBe(40.5);
    expect(alignHalfPixel(40.9)).toBe(40.5);
  });
});

describe("pixelRatio", () => {
  it("dpr=2 means four times pixels", () => {
    expect(pixelRatio(2)).toBe(4);
  });

  it("dpr=3 means nine times pixels", () => {
    expect(pixelRatio(3)).toBe(9);
  });

  it("doubling ratio quadruples pixels", () => {
    const dpr = 1.5;
    expect(pixelRatio(dpr * 2)).toBeCloseTo(pixelRatio(dpr) * 4);
  });
});
