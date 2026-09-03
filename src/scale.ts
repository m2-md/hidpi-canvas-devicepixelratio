// scale.ts — pure conversion math, does not touch the DOM

export interface Size {
  w: number;
  h: number;
}

// CSS dimension → device pixels (for canvas.width / canvas.height)
// Rounding is required: canvas.width must be an integer, truncating fractions.
export function deviceSize(cssW: number, cssH: number, dpr: number): Size {
  return {
    w: Math.round(cssW * dpr),
    h: Math.round(cssH * dpr),
  };
}

// Convert a single length between the two spaces (apply / invert ratio)
export function cssToDevice(px: number, dpr: number): number {
  return px * dpr;
}

export function deviceToCss(px: number, dpr: number): number {
  return px / dpr;
}

// 0.5 alignment for crisp 1px lines.
// integer → +0.5 (centered); values already at .5 remain unchanged.
export function alignHalfPixel(x: number): number {
  return Math.floor(x) + 0.5;
}

// As DPR increases, the number of rendered pixels increases quadratically.
// dpr=2 → 4× pixels, dpr=3 → 9× pixels.
export function pixelRatio(dpr: number): number {
  return dpr * dpr;
}
