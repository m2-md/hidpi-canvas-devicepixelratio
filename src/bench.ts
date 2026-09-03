// bench.ts — both arithmetic and empirical proof of dpr² fill-rate.
// In a headless (node) environment there is no canvas; therefore, we simulate
// the cost of "rendered pixels" by writing to a real typed array (RGBA byte buffer).
// clearRect ≈ zero out buffer, fillRect ≈ write color bytes to buffer. Since device
// pixel count grows with dpr², measured ms/frame also follows the dpr² trend.

import { deviceSize, pixelRatio } from "./scale";

export interface FillRateRow {
  dpr: number;
  devW: number;
  devH: number;
  perFrame: number; // rendered device pixels per frame
  perSecond: number; // multiplied by fps
}

// Pure arithmetic: matches the fill-rate table described in the article.
export function fillRateTable(
  cssW: number,
  cssH: number,
  fps: number,
  dprs: number[],
): FillRateRow[] {
  return dprs.map((dpr) => {
    const { w, h } = deviceSize(cssW, cssH, dpr);
    const perFrame = w * h;
    return { dpr, devW: w, devH: h, perFrame, perSecond: perFrame * fps };
  });
}

export interface CostRow {
  dpr: number;
  devW: number;
  devH: number;
  msPerFrame: number;
  vs1x: number; // measured cost ratio relative to dpr=1
  expected: number; // pixelRatio(dpr): expected dpr² ratio
}

// Empirical measurement: clear + fill RGBA bytes matching device pixel count each frame.
// Allocated once (so alloc cost doesn't contaminate measurement), then clear+fill is executed
// for the given frame count and total duration is divided by frame count.
export function measureFillCost(
  cssW: number,
  cssH: number,
  dpr: number,
  frames: number,
): { devW: number; devH: number; msPerFrame: number } {
  const { w, h } = deviceSize(cssW, cssH, dpr);
  const buf = new Uint8ClampedArray(w * h * 4);
  const n = buf.length;

  const start = performance.now();
  for (let f = 0; f < frames; f++) {
    // similar to clearRect: reset entire buffer to 0
    buf.fill(0);
    // similar to fillRect: write opaque color (RGBA) to entire buffer
    for (let i = 0; i < n; i += 4) {
      buf[i] = 124;
      buf[i + 1] = 58;
      buf[i + 2] = 237;
      buf[i + 3] = 255;
    }
  }
  const total = performance.now() - start;
  return { devW: w, devH: h, msPerFrame: total / frames };
}

export function costTrend(
  cssW: number,
  cssH: number,
  frames: number,
  dprs: number[],
): CostRow[] {
  const base = measureFillCost(cssW, cssH, 1, frames).msPerFrame;
  return dprs.map((dpr) => {
    const m = measureFillCost(cssW, cssH, dpr, frames);
    return {
      dpr,
      devW: m.devW,
      devH: m.devH,
      msPerFrame: m.msPerFrame,
      vs1x: m.msPerFrame / base,
      expected: pixelRatio(dpr),
    };
  });
}
