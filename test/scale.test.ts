import { describe, it, expect } from "vitest";
import {
  deviceSize,
  cssToDevice,
  deviceToCss,
  alignHalfPixel,
  pixelRatio,
} from "../src/scale";

describe("deviceSize", () => {
  it("dpr=1'de CSS boyutu aynen kalır", () => {
    expect(deviceSize(300, 150, 1)).toEqual({ w: 300, h: 150 });
  });

  it("dpr=2'de her kenar ikiye katlanır", () => {
    expect(deviceSize(300, 150, 2)).toEqual({ w: 600, h: 300 });
  });

  it("dpr=3'te her kenar üçe katlanır", () => {
    expect(deviceSize(400, 300, 3)).toEqual({ w: 1200, h: 900 });
  });

  it("küsuratlı CSS boyutunu tam sayıya yuvarlar", () => {
    // 300.4 * 1.5 = 450.6 → 451 ; 150.2 * 1.5 = 225.3 → 225
    expect(deviceSize(300.4, 150.2, 1.5)).toEqual({ w: 451, h: 225 });
  });
});

describe("cssToDevice / deviceToCss", () => {
  it("cssToDevice kur ile çarpar", () => {
    expect(cssToDevice(100, 2)).toBe(200);
    expect(cssToDevice(100, 3)).toBe(300);
  });

  it("deviceToCss kuru geri alır", () => {
    expect(deviceToCss(200, 2)).toBe(100);
  });

  it("gidiş-dönüş başlangıç değerine döner", () => {
    for (const dpr of [1, 1.5, 2, 3]) {
      const px = 137;
      expect(deviceToCss(cssToDevice(px, dpr), dpr)).toBeCloseTo(px);
    }
  });
});

describe("alignHalfPixel", () => {
  it("tam sayıyı yarım piksele ortalar", () => {
    expect(alignHalfPixel(40)).toBe(40.5);
    expect(alignHalfPixel(0)).toBe(0.5);
  });

  it("zaten .5 olan değeri değiştirmez", () => {
    expect(alignHalfPixel(40.5)).toBe(40.5);
  });

  it("küsuratlı değeri aşağı tabana oturtup ortalar", () => {
    expect(alignHalfPixel(40.2)).toBe(40.5);
    expect(alignHalfPixel(40.9)).toBe(40.5);
  });
});

describe("pixelRatio", () => {
  it("dpr=2 dört kat piksel demektir", () => {
    expect(pixelRatio(2)).toBe(4);
  });

  it("dpr=3 dokuz kat piksel demektir", () => {
    expect(pixelRatio(3)).toBe(9);
  });

  it("kuru ikiye katlamak pikseli dörde katlar", () => {
    const dpr = 1.5;
    expect(pixelRatio(dpr * 2)).toBeCloseTo(pixelRatio(dpr) * 4);
  });
});
