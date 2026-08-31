# Aynı Canvas, İki Ayrı Boyut — devicePixelRatio

"Aynı Canvas, İki Ayrı Boyut: devicePixelRatio ile Bulanıklığı Bitirmek"
makalesinin çalışan kodu. Retina/HiDPI ekranda canvas'ın neden bulanıklaştığını,
iç çözünürlük (cihaz pikseli) ile görünen boyutu (CSS pikseli) ayırarak nasıl
keskinleştirileceğini ve bu keskinliğin `dpr²` fill-rate bedelini gösterir.

İki katman:

1. **Saf ölçekleme matematiği** (`src/scale.ts`) — DOM'a dokunmaz. `deviceSize`,
   `cssToDevice`, `deviceToCss`, `alignHalfPixel`, `pixelRatio`. Tüm testler
   yalnızca bunu çağırır → deterministik, headless.
2. **Canvas/DOM katmanı** (`src/hidpi.ts`) — `setupHiDPICanvas`, `watchDprChange`
   (dpr değişimini `matchMedia` ile yakalar), `resizeToDisplaySize`. Test edilmez
   (headless vitest'te `canvas`, `window.devicePixelRatio`, `matchMedia` yok).
3. **Demo** (`src/main.ts` + `index.html`) — yan yana iki canvas: naif (bulanık)
   vs HiDPI (keskin), 1×/2×/3× dpr simülasyon anahtarı, canlı piksel sayacı.

## Kurulum

```bash
npm install
```

## Çalıştırma

```bash
npm run dev
```

`http://localhost:5173/` → yan yana demo. **`file://` ile açılmaz, dev server şart.**

- Sol canvas naif kurulum (kur yok): sahne CSS çözünürlüğünde çizilip cihaz
  çözünürlüğüne büyütülür → dpr arttıkça bulanıklaşır.
- Sağ canvas `setupHiDPICanvas` ile HiDPI: her dpr'da keskin kalır.
- Üstteki 1×/2×/3× anahtarı simüle edilen dpr'ı değiştirir; HUD'da kare başına
  boyanan piksel `1× → 4× → 9×` büyür.
- Pencereyi başka DPI'li bir monitöre sürüklerseniz konsola
  `dpr X: piksel çarpanı Y×` düşer (`watchDprChange`).

Görünen bulanık/keskin farkını en net görmek için ince çizgilere ve 11px metne
bakın; gerçek bir HiDPI ekranda ya da DevTools cihaz emülasyonunda (DPR ayarı)
fark çıplak gözle belli olur.

## Test

```bash
npm test
```

13 saf test ölçekleme matematiğini doğrular: `deviceSize` yuvarlama (dpr 1/2/3 +
küsuratlı), `cssToDevice`/`deviceToCss` gidiş-dönüş, `alignHalfPixel` yarım piksel
hizalama, `pixelRatio` karesel oran. Hiçbiri DOM API'si çağırmaz.

Beklenen çıktı:

```
 ✓ test/scale.test.ts (13 tests)
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

## Bench

```bash
npm run bench
```

Fill-rate'in `dpr²` ile büyüdüğünü hem aritmetik hem ölçülmüş olarak gösterir.
Headless node'da canvas yok; "boyanan piksel" maliyeti cihaz pikseli kadar RGBA
byte'ı her karede temizleyip doldurarak (clearRect + fillRect analogu) ölçülür.

Örnek çıktı (Node v22, Apple Silicon; makinaya göre değişir):

```
fill-rate tablosu (400×300 CSS, 60 FPS) — saf aritmetik
  dpr  iç çözünürlük   kare başı piksel   saniyede piksel
    1        400×300          120,000            7.2M
    2        800×600          480,000           28.8M
    3       1200×900        1,080,000           64.8M

ölçülen maliyet (clear+fill, 200 kare) — dpr² eğilimi doğrulaması
  dpr  iç çözünürlük     ms/kare   1x'e oran   beklenen dpr²
    1        400×300      0.179      0.95×            1×
    2        800×600      0.736      3.89×            4×
    3       1200×900      1.661      8.78×            9×
```

Ölçülen `1x'e oran` sütunu beklenen `dpr²` (1×/4×/9×) eğilimini izler; küçük
sapmalar ölçüm gürültüsüdür.

## Build

```bash
npm run build   # tsc && vite build
npm run typecheck
```

## Dosya yapısı

```
src/
  scale.ts      # saf ölçekleme matematiği (test edilen tek katman)
  hidpi.ts      # canvas/DOM katmanı: setup, watchDprChange, resize
  main.ts       # demo: naif vs HiDPI, dpr anahtarı, HUD
  bench.ts      # fill-rate tablosu + ölçülen maliyet
  bench-cli.ts  # bench çıktısını basar
test/
  scale.test.ts
index.html
```

## Lisans

MIT
