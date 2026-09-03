import { setupHiDPICanvas, watchDprChange } from "./hidpi";
import { deviceSize, alignHalfPixel, pixelRatio } from "./scale";

const CSS_W = 320;
const CSS_H = 200;

const naive = document.querySelector<HTMLCanvasElement>("#naive")!;
const hidpi = document.querySelector<HTMLCanvasElement>("#hidpi")!;
const hud = document.querySelector<HTMLDivElement>("#hud")!;

// To blur the naive side: draw the scene once at CSS resolution
// (dpr=1) offscreen, then upscale and paint to device resolution. An exact
// simulation of what the browser does on retina displays with a naive canvas.
const offscreen = document.createElement("canvas");
offscreen.width = CSS_W;
offscreen.height = CSS_H;
const offCtx = offscreen.getContext("2d")!;

let activeDpr = 1;

// Same vector scene: fine lines, small text, a circle contour.
// Coordinates in CSS space; alignHalfPixel on crisp 1px lines.
function drawScene(ctx: CanvasRenderingContext2D, label: string): void {
  ctx.clearRect(0, 0, CSS_W, CSS_H);

  // small text (the toughest test of sharpness)
  ctx.fillStyle = "#1c1917";
  ctx.font = "11px system-ui";
  ctx.fillText(label, 14, 22);
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#7c3aed";
  ctx.fillText("crisp text: 11px system-ui", 14, 42);

  // fine vertical lines (1px), aligned to half-pixel
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = alignHalfPixel(20 + i * 12);
    ctx.beginPath();
    ctx.moveTo(x, 56);
    ctx.lineTo(x, 120);
    ctx.stroke();
  }

  // fine horizontal lines (1px)
  for (let i = 0; i < 4; i++) {
    const y = alignHalfPixel(60 + i * 12);
    ctx.beginPath();
    ctx.moveTo(140, y);
    ctx.lineTo(300, y);
    ctx.stroke();
  }

  // circle contour
  ctx.beginPath();
  ctx.arc(250, 150, 34, 0, Math.PI * 2);
  ctx.stroke();

  // pixel-art grid: smoothing off, crisp corners
  ctx.imageSmoothingEnabled = false;
  ctx.strokeStyle = "#0ea5e9";
  ctx.strokeRect(alignHalfPixel(20), alignHalfPixel(140), 90, 44);
  for (let gx = 20; gx <= 110; gx += 15) {
    const x = alignHalfPixel(gx);
    ctx.beginPath();
    ctx.moveTo(x, 140);
    ctx.lineTo(x, 184);
    ctx.stroke();
  }
}

function renderHiDPI(): void {
  // HiDPI: internal resolution in device pixels, draw in CSS space → crisp
  const ctx = setupHiDPICanvas(hidpi, CSS_W, CSS_H, activeDpr);
  drawScene(ctx, "HiDPI: crisp");
}

function renderNaive(): void {
  // Naive: scene drawn at CSS resolution, then upscaled to device resolution.
  // As DPR increases, upscaling blurriness also increases.
  drawScene(offCtx, "Naive: blurry");

  const { w, h } = deviceSize(CSS_W, CSS_H, activeDpr);
  naive.width = w;
  naive.height = h;
  naive.style.width = `${CSS_W}px`;
  naive.style.height = `${CSS_H}px`;

  const ctx = naive.getContext("2d")!;
  ctx.imageSmoothingEnabled = true; // browser naive upscaling
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(offscreen, 0, 0, CSS_W, CSS_H, 0, 0, w, h);
}

function updateHud(): void {
  const { w, h } = deviceSize(CSS_W, CSS_H, activeDpr);
  hud.innerHTML =
    `actual window.devicePixelRatio: <b>${window.devicePixelRatio}</b><br>` +
    `simulated dpr: <b>${activeDpr}×</b><br>` +
    `HiDPI internal resolution: <b>${w}×${h}</b> device pixels<br>` +
    `rendered pixels per frame: <b>${(w * h).toLocaleString("en-US")}</b><br>` +
    `pixel multiplier pixelRatio(${activeDpr}): <b>${pixelRatio(activeDpr)}×</b>`;
}

function renderAll(): void {
  renderNaive();
  renderHiDPI();
  updateHud();
}

for (const btn of document.querySelectorAll<HTMLButtonElement>(
  "button[data-dpr]",
)) {
  btn.addEventListener("click", () => {
    activeDpr = Number(btn.dataset.dpr);
    for (const b of document.querySelectorAll("button[data-dpr]")) {
      b.classList.toggle("active", b === btn);
    }
    renderAll();
  });
}

// initial: round and select actual screen DPR (clamped to 1/2/3).
activeDpr = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
document
  .querySelector<HTMLButtonElement>(`button[data-dpr="${activeDpr}"]`)
  ?.classList.add("active");

// If actual DPR changes across multi-monitor setups, log to console and re-render.
watchDprChange((dpr) => {
  console.log(`dpr ${dpr}: pixel multiplier ${pixelRatio(dpr)}×`);
  renderAll();
});

renderAll();
