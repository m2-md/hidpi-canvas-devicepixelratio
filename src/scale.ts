// scale.ts — saf çeviri matematiği, DOM'a dokunmaz

export interface Size {
  w: number;
  h: number;
}

// CSS boyutu → cihaz pikseli (canvas.width / canvas.height için)
// Yuvarlama şart: canvas.width tam sayı olmak zorunda, küsuratı atar.
export function deviceSize(cssW: number, cssH: number, dpr: number): Size {
  return {
    w: Math.round(cssW * dpr),
    h: Math.round(cssH * dpr),
  };
}

// Tek bir uzunluğu iki yön arasında çevir (kur uygula / kuru geri al)
export function cssToDevice(px: number, dpr: number): number {
  return px * dpr;
}

export function deviceToCss(px: number, dpr: number): number {
  return px / dpr;
}

// 1px keskin çizgiler için 0.5 hizalama.
// Tam sayı → +0.5 (ortala); zaten .5 olan değer değişmez.
export function alignHalfPixel(x: number): number {
  return Math.floor(x) + 0.5;
}

// dpr artınca boyanan piksel sayısı karesel artar.
// dpr=2 → 4× piksel, dpr=3 → 9× piksel.
export function pixelRatio(dpr: number): number {
  return dpr * dpr;
}
