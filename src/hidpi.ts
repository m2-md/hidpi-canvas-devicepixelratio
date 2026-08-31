// hidpi.ts — canvas / DOM'a dokunan taraf
import { deviceSize } from "./scale";

export function setupHiDPICanvas(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  dpr: number = window.devicePixelRatio || 1,
): CanvasRenderingContext2D {
  const { w, h } = deviceSize(cssW, cssH, dpr);

  // İç çözünürlük: cihaz pikseli (bitmap gerçekte bu kadar nokta)
  canvas.width = w;
  canvas.height = h;

  // Görünen boyut: CSS pikseli (ekranda bu kadar yer kaplasın)
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context alınamadı");

  // Kuru bir kez sabitle: çizim koordinatları CSS uzayında kalsın
  ctx.setTransform(1, 0, 0, 1, 0, 0); // önce temizle
  ctx.scale(dpr, dpr); // sonra ölçekle
  return ctx;
}

// dpr değişimini dinler; her değişimde cb'yi yeni dpr ile çağırır.
// Dönüş: dinlemeyi durduran fonksiyon.
export function watchDprChange(cb: (dpr: number) => void): () => void {
  let media: MediaQueryList | null = null;

  const handler = () => {
    cb(window.devicePixelRatio || 1);
    listen(); // yeni dpr için taze bir sorgu kur
  };

  const listen = () => {
    const dpr = window.devicePixelRatio || 1;
    // Bu sorgu yalnızca dpr === mevcut değerken eşleşir.
    // dpr saparsa eşleşme kopar → change tetiklenir.
    media = window.matchMedia(`(resolution: ${dpr}dppx)`);
    media.addEventListener("change", handler, { once: true });
  };

  listen();
  return () => media?.removeEventListener("change", handler);
}

// Boyut veya dpr değişince tuvali yeniden kurar.
// Değişiklik yoksa dokunmaz (canvas.width yazmak içeriği siler).
// Dönüş: gerçekten yeniden kuruldu mu?
export function resizeToDisplaySize(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  dpr: number = window.devicePixelRatio || 1,
): boolean {
  const { w, h } = deviceSize(cssW, cssH, dpr);

  if (canvas.width === w && canvas.height === h) {
    return false; // zaten doğru, dokunma
  }

  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  // Transform'u sıfırla ve yeniden ölçekle. setTransform ikisini tek çağrıda yapar:
  // (dpr, 0, 0, dpr, 0, 0) = identity'yi temizle + scale(dpr, dpr).
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return true;
}
