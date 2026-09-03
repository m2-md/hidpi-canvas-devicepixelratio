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
  `Fill-rate table (${CSS_W}×${CSS_H} CSS, ${FPS} FPS) — pure arithmetic`,
);
console.log("  dpr  internal res    pixels/frame       pixels/second");
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
  `Measured cost (clear+fill, ${FRAMES} frames) — dpr² trend verification`,
);
console.log("  dpr  internal res      ms/frame  ratio to 1x  expected dpr²");
for (const r of costTrend(CSS_W, CSS_H, FRAMES, DPRS)) {
  console.log(
    "  " +
      pad(String(r.dpr), 3) +
      "  " +
      pad(`${r.devW}×${r.devH}`, 13) +
      "  " +
      pad(r.msPerFrame.toFixed(3), 9) +
      "  " +
      pad(r.vs1x.toFixed(2) + "×", 11) +
      "  " +
      pad(r.expected.toFixed(0) + "×", 13),
  );
}
