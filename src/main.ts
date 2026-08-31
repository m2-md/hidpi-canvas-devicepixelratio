import { setupHiDPICanvas, watchDprChange } from "./hidpi";
import { deviceSize, alignHalfPixel, pixelRatio } from "./scale";

const CSS_W = 320;
const CSS_H = 200;

const naive = document.querySelector<HTMLCanvasElement>("#naive")!;
const hidpi = document.querySelector<HTMLCanvasElement>("#hidpi")!;
const hud = document.querySelector<HTMLDivElement>("#hud")!;

// Naif tarafı bulanıklaştırmak için: sahneyi bir kez CSS çözünürlüğünde
// (dpr=1) offscreen çiz, sonra cihaz çözünürlüğüne büyüterek bas. Tarayıcının
// naif bir canvas'a retina'da yaptığı upscaling'in birebir simülasyonu.
const offscreen = document.createElement("canvas");
offscreen.width = CSS_W;
offscreen.height = CSS_H;
const offCtx = offscreen.getContext("2d")!;

let activeDpr = 1;

// Aynı vektör sahne: ince çizgiler, küçük metin, bir daire kenarı.
// Koordinatlar CSS uzayında; keskin 1px çizgilerde alignHalfPixel.
function drawScene(ctx: CanvasRenderingContext2D, label: string): void {
  ctx.clearRect(0, 0, CSS_W, CSS_H);

  // küçük metin (keskinliğin en zorlu testi)
  ctx.fillStyle = "#1c1917";
  ctx.font = "11px system-ui";
  ctx.fillText(label, 14, 22);
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#7c3aed";
  ctx.fillText("keskin metin: 11px system-ui", 14, 42);

  // ince dikey çizgiler (1px), yarım piksele hizalı
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = alignHalfPixel(20 + i * 12);
    ctx.beginPath();
    ctx.moveTo(x, 56);
    ctx.lineTo(x, 120);
    ctx.stroke();
  }

  // ince yatay çizgiler (1px)
  for (let i = 0; i < 4; i++) {
    const y = alignHalfPixel(60 + i * 12);
    ctx.beginPath();
    ctx.moveTo(140, y);
    ctx.lineTo(300, y);
    ctx.stroke();
  }

  // daire kenarı
  ctx.beginPath();
  ctx.arc(250, 150, 34, 0, Math.PI * 2);
  ctx.stroke();

  // piksel-art grid: smoothing kapalı, keskin köşeler
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
  // HiDPI: iç çözünürlük cihaz pikseli, çizim CSS uzayında → keskin
  const ctx = setupHiDPICanvas(hidpi, CSS_W, CSS_H, activeDpr);
  drawScene(ctx, "HiDPI: keskin");
}

function renderNaive(): void {
  // Naif: sahne CSS çözünürlüğünde çizilir, sonra cihaz çözünürlüğüne
  // büyütülür. dpr arttıkça upscaling bulanıklığı da artar.
  drawScene(offCtx, "Naif: bulanık");

  const { w, h } = deviceSize(CSS_W, CSS_H, activeDpr);
  naive.width = w;
  naive.height = h;
  naive.style.width = `${CSS_W}px`;
  naive.style.height = `${CSS_H}px`;

  const ctx = naive.getContext("2d")!;
  ctx.imageSmoothingEnabled = true; // tarayıcının naif upscaling'i
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(offscreen, 0, 0, CSS_W, CSS_H, 0, 0, w, h);
}

function updateHud(): void {
  const { w, h } = deviceSize(CSS_W, CSS_H, activeDpr);
  hud.innerHTML =
    `gerçek window.devicePixelRatio: <b>${window.devicePixelRatio}</b><br>` +
    `simüle edilen dpr: <b>${activeDpr}×</b><br>` +
    `HiDPI iç çözünürlük: <b>${w}×${h}</b> cihaz pikseli<br>` +
    `kare başına boyanan piksel: <b>${(w * h).toLocaleString("en-US")}</b><br>` +
    `piksel çarpanı pixelRatio(${activeDpr}): <b>${pixelRatio(activeDpr)}×</b>`;
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

// Başlangıç: gerçek ekranın dpr'ını yuvarlayıp seç (1/2/3'e sıkıştır).
activeDpr = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
document
  .querySelector<HTMLButtonElement>(`button[data-dpr="${activeDpr}"]`)
  ?.classList.add("active");

// Ekranlar arası taşımada gerçek dpr değişirse konsola bas ve yeniden kur.
watchDprChange((dpr) => {
  console.log(`dpr ${dpr}: piksel çarpanı ${pixelRatio(dpr)}×`);
  renderAll();
});

renderAll();
