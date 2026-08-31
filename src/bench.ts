// bench.ts — dpr² fill-rate'in hem aritmetik hem ölçülmüş kanıtı.
// Headless (node) ortamda canvas yok; bu yüzden "boyanan piksel" maliyetini
// gerçek bir tipli dizi (RGBA byte buffer) üzerine yazarak simüle ediyoruz.
// clearRect ≈ buffer'ı sıfırla, fillRect ≈ buffer'a renk yaz. Cihaz pikseli
// sayısı dpr² ile büyüdüğü için ölçülen ms/kare de dpr² eğilimini izler.

import { deviceSize, pixelRatio } from "./scale";

export interface FillRateRow {
  dpr: number;
  devW: number;
  devH: number;
  perFrame: number; // kare başına boyanan cihaz pikseli
  perSecond: number; // fps ile çarpılmış
}

// Saf aritmetik: makaledeki fill-rate tablosunun ta kendisi.
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
  vs1x: number; // dpr=1'e göre ölçülen maliyet oranı
  expected: number; // pixelRatio(dpr): beklenen dpr² oranı
}

// Gerçek ölçüm: cihaz pikseli kadar RGBA byte'ı her karede temizle + doldur.
// Bir kez allocate edilir (alloc maliyeti ölçüme karışmasın), sonra frames kez
// clear+fill yapılıp toplam süre kare sayısına bölünür.
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
    // clearRect benzeri: tüm buffer'ı sıfırla
    buf.fill(0);
    // fillRect benzeri: tüm buffer'a opak renk yaz (RGBA)
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
