import { fillRateTable, costTrend } from "./bench";

const CSS_W = 400;
const CSS_H = 300;
const FPS = 60;
const DPRS = [1, 2, 3];
const FRAMES = 200;

function pad(s: string, n: number): string {
  return s.length >= n ? s : " ".repeat(n - s.length) + s;
}

function millions(n: number): string {
  return (n / 1_000_000).toFixed(1) + "M";
}

console.log(
  `fill-rate tablosu (${CSS_W}×${CSS_H} CSS, ${FPS} FPS) — saf aritmetik`,
);
console.log("  dpr  iç çözünürlük   kare başı piksel   saniyede piksel");
for (const r of fillRateTable(CSS_W, CSS_H, FPS, DPRS)) {
  console.log(
    "  " +
      pad(String(r.dpr), 3) +
      "  " +
      pad(`${r.devW}×${r.devH}`, 13) +
      "  " +
      pad(r.perFrame.toLocaleString("en-US"), 15) +
      "  " +
      pad(millions(r.perSecond), 14),
  );
}

console.log("");
console.log(
  `ölçülen maliyet (clear+fill, ${FRAMES} kare) — dpr² eğilimi doğrulaması`,
);
console.log("  dpr  iç çözünürlük     ms/kare   1x'e oran   beklenen dpr²");
for (const r of costTrend(CSS_W, CSS_H, FRAMES, DPRS)) {
  console.log(
    "  " +
      pad(String(r.dpr), 3) +
      "  " +
      pad(`${r.devW}×${r.devH}`, 13) +
      "  " +
      pad(r.msPerFrame.toFixed(3), 9) +
      "  " +
      pad(r.vs1x.toFixed(2) + "×", 9) +
      "  " +
      pad(r.expected.toFixed(0) + "×", 12),
  );
}
