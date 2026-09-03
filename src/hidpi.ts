// hidpi.ts — canvas / DOM manipulation layer
import { deviceSize } from "./scale";

export function setupHiDPICanvas(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  dpr: number = window.devicePixelRatio || 1,
): CanvasRenderingContext2D {
  const { w, h } = deviceSize(cssW, cssH, dpr);

  // Internal resolution: device pixels (the actual bitmap resolution)
  canvas.width = w;
  canvas.height = h;

  // Display dimensions: CSS pixels (layout size on screen)
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D context");

  // Fix the transform: drawing coordinates stay in CSS space
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset first
  ctx.scale(dpr, dpr); // then scale
  return ctx;
}

// Listens for DPR changes; invokes callback with new DPR on each change.
// Returns: cleanup function to remove listener.
export function watchDprChange(cb: (dpr: number) => void): () => void {
  let media: MediaQueryList | null = null;

  const handler = () => {
    cb(window.devicePixelRatio || 1);
    listen(); // register a fresh query for the new DPR
  };

  const listen = () => {
    const dpr = window.devicePixelRatio || 1;
    // This query matches only while dpr === current value.
    // If DPR drifts, the match breaks → change is triggered.
    media = window.matchMedia(`(resolution: ${dpr}dppx)`);
    media.addEventListener("change", handler, { once: true });
  };

  listen();
  return () => media?.removeEventListener("change", handler);
}

// Reconfigures the canvas when dimensions or DPR change.
// If unchanged, leaves it untouched (writing canvas.width clears content).
// Returns: boolean indicating whether resizing actually took place.
export function resizeToDisplaySize(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  dpr: number = window.devicePixelRatio || 1,
): boolean {
  const { w, h } = deviceSize(cssW, cssH, dpr);

  if (canvas.width === w && canvas.height === h) {
    return false; // already correct, do not modify
  }

  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  // Reset transform and rescale. setTransform performs both in a single call:
  // (dpr, 0, 0, dpr, 0, 0) = clear to identity + scale(dpr, dpr).
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return true;
}
