# Retina Ekranda Canvas Neden Puslu Görünür? devicePixelRatio ve İki Ayrı Boyutun Hikâyesi

*CSS pikseli ile cihaz pikseli aynı şey değil. İç çözünürlüğü cihaza, görünen boyutu CSS'e ayırıp jilet gibi keskin bir tuval kuruyoruz — sonra da bu keskinliğin dpr² faturasını dürüstçe ölçüyoruz.*

*Tahmini okuma süresi: 15 dakika*

---

Geçen hafta aynı canvas kodunu iki ekranda açtım. Harici bir monitörde çizgiler jilet gibiydi. Dizüstünün kendi retina ekranına aldığımda ise aynı çizgiler sisin arkasından bakıyormuş gibi puslandı. Tek satır kod değişmedi. Değişen tek şey ekrandı.

İlk tepkim "font mu bozuk, anti-aliasing mı fazla" oldu. İkisi de değildi.

Sorun daha temeldeydi: canvas'a çizdiğim şeyle ekranın gösterdiği şey iki ayrı ölçekte yaşıyordu. Ben 300 birim genişlik istemişim, retina panel 600 nokta boyamak istiyordu, aradaki farkı tarayıcı "büyüterek" kapatıyordu. Büyütmek de her zaman bulanıklık demek.

Bu yazının zihin modeli bir döviz meselesi. Ekranın iki para birimi var: CSS pikseli (CSS pixel, senin ve layout'un konuştuğu birim) ve cihaz pikseli (device pixel, panelin gerçekten sahip olduğu nokta). Normal bir ekranda kur birebir, hiç dert yok. Retina'da ise kur ikiye, hatta üçe çıkıyor. Yanlış para biriminde çizim yaparsanız, tarayıcı sizi kasada "bozuk para" gibi ağırlıklandırıp değeri buluyor. O bozukluk ekranda bulanıklık olarak görünüyor.

`devicePixelRatio` işte bu kurun ta kendisi. Yol haritamız da onun etrafında dönüyor: önce bulanıklığın nereden geldiğini göreceğiz, sonra iç çözünürlük ile görünen boyutu ayırıp `ctx.scale` ile kuru bir kez sabitleyeceğiz, keskinliğin iki gizli düşmanını (yarım piksel hizalaması ve bulanık ölçekleme) etkisiz kılacağız, ekranlar arası taşımada kurun değişebileceğini yakalayacağız, ve en sonunda bu keskinliğin `dpr²`'lik fill-rate (piksel doldurma) bedelini önce hesaplayıp sonra gerçekten ölçeceğiz.

Bir itiraf ile başlayayım, çünkü bu yazının sebebi o. Bu seride sıfırdan bir fizik motoru yazdığımız yazıda şöyle bir cümle kurmuştum: "Canvas'ın iç çözünürlüğü ekranla birebir olunca CSS ölçeklemesi kalmaz." O cümle yanlış değil ama eksik. Orada canvas'ın genişliğini `window.innerWidth` yapmıştım, o da CSS pikseli. Retina'da CSS pikseli cihaz pikselinden az. Yani "birebir" dediğim şey aslında yarı çözünürlüktü ve oyun retina'da bulanık çiziliyordu. Kimse fark etmedi çünkü daireler ve düz renkler bulanıklığı affeder. İnce çizgiler ve küçük metin affetmez. Bu yazı tam da o eksiği kapatıyor.

### Neden Bulanık? CSS Pikseli ile Cihaz Pikseli

Önce iki para birimini net ayıralım.

CSS pikseli soyut bir ölçü birimidir. `width: 300px` yazdığınızda, "bu kutu 300 CSS pikseli geniş olsun" demiş olursunuz. Cihaz pikseli ise fiziksel: panelin üzerindeki gerçek, ışık saçan nokta. Eski bir ekranda bu ikisi birebirdi, 1 CSS pikseli tam 1 cihaz pikseline denk düşerdi. Kur 1'di.

Retina ekranlar bu eşitliği bilerek bozdu. Amaç, metni ve arayüzü daha keskin göstermekti: aynı fiziksel alana iki kat nokta sıkıştır, ama arayüzü küçültme. Sonuç olarak 1 CSS pikseli, 2×2 = 4 cihaz pikseline yayıldı. Metin ve SVG bundan bedava faydalanır, çünkü tarayıcı onları vektörden yeniden çizer.

Canvas ise faydalanamaz. Çünkü canvas bir bitmap. İçine ne çizdiyseniz o kadar nokta vardır.

Şöyle düşünün. `<canvas width="300" height="150">` dediğinizde, elinizde 300×150 cihaz pikselilik bir tuval oluyor. Ama CSS bu tuvali retina ekranda 300 CSS pikseli, karşılığı 600 cihaz pikseli genişliğinde bir alana yaymak istiyor. Tarayıcının elinde 300 nokta var, doldurması gereken 600 nokta var. Aradaki boşluğu upscaling (yukarı ölçekleme) ile, komşu pikselleri karıştırıp interpolasyonla kapatıyor. O karıştırmanın sonucu da bulanıklık.

Tek cümlede: az para basıp çok yere harcamaya çalıştınız, kasa da farkı bulanıklıkla kapattı.

### devicePixelRatio: İki Para Birimi Arasındaki Kur

`window.devicePixelRatio`, tarayıcının size verdiği kur bilgisidir. Tanımı basit: bir CSS pikseli kaç cihaz pikseline karşılık geliyor.

- Normal ekran: `devicePixelRatio === 1` (1 CSS px = 1 cihaz px)
- Çoğu retina/HiDPI ekran: `devicePixelRatio === 2` (1 CSS px = 2 cihaz px)
- Bazı yüksek yoğunluklu telefonlar: `devicePixelRatio === 3`

Değer her zaman tam sayı da değildir. Tarayıcı zoom'u yaptığınızda `1.25`, `1.5` gibi küsuratlı kurlar görürsünüz. Bu yüzden koda "dpr ya 1'dir ya 2'dir" varsayımı gömmek ilerideki bir bug'ın tohumudur. Kur bir sayıdır, ne gelirse onu kullanırız.

Kurdan türeyen ilk iş, çizim uzunluklarını bir para biriminden ötekine çevirmek. Bunlar saf fonksiyonlar, canvas'a hiç dokunmazlar, o yüzden birazdan hepsini test edeceğiz:

```ts
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
```

`deviceSize` içindeki `Math.round`'a dikkat. `canvas.width` bir tam sayı olmak zorunda; ondalık verirseniz tarayıcı sessizce aşağı yuvarlar. CSS boyutu 300.5 gibi küsuratlıysa (esnek layout'larda olur), kuru uyguladıktan sonra yuvarlamayı biz kontrol edelim ki bir piksellik kaymalar birikip sürprize dönüşmesin.

Peki elimizde kur var, çeviri fonksiyonları var. Şimdi bunları gerçek bir canvas kurulumunda kullanalım.

### İç Çözünürlük ve CSS Boyutu: canvas.width vs style.width

Canvas'ın kafa karıştıran ama her şeyin döndüğü gerçeği şu: bir `<canvas>` elemanının iki ayrı boyutu vardır ve bunlar birbirinden bağımsızdır.

Birincisi **iç çözünürlük** (intrinsic resolution): `canvas.width` ve `canvas.height`. Bu, tuvalin kaç piksellik bir bitmap olduğunu söyler. Cihaz pikseli cinsinden düşünmeliyiz.

İkincisi **görünen boyut** (display size): `canvas.style.width` ve `canvas.style.height`. Bu, elemanın sayfada kapladığı CSS alanıdır. CSS pikseli cinsinden.

Naif kod bu ikisini birbirine karıştırır, ya da sadece birini ayarlayıp ötekini tarayıcıya bırakır. Keskin canvas'ın bütün sırrı ise ikisini bilinçli ve farklı ayarlamaktır: iç çözünürlüğü kur ile çarpıp cihaz pikseline çıkar, görünen boyutu CSS pikselinde bırak.

```ts
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
```

Retina'da (`dpr = 2`) bu kod ne yapıyor? `canvas.width` 600 oluyor (tuval gerçekten 600 nokta geniş), `canvas.style.width` ise 300px kalıyor (ekranda 300 CSS pikseli yer kaplıyor). Tarayıcının artık büyütecek bir şeyi yok: elinde 600 nokta var, dolduracağı yer 600 cihaz pikseli. Kur birebir oturdu, bulanıklık gitti.

Ama bir sorun kaldı. Tuvalimiz artık 600×300'lük bir koordinat sistemi. Çizim kodumuzu da 600'lük dünyaya göre mi yazacağız? Her `dpr` değişiminde bütün koordinatları elle mi çarpacağız? Olmaz. Bunun temiz çözümü bir sonraki satırda gizli.

### ctx.scale: Kuru Bir Kez Sabitle, Gerisini Unut

`ctx.scale(dpr, dpr)` satırı bu yazının kalbi. Yaptığı şey tek cümleyle şu: bundan sonra verdiğin bütün koordinatları CSS uzayında kabul edeceğim, cihaz uzayına çevirmeyi ben hallederim.

Döviz benzetmesinde tam karşılığı var. Kuru her alışverişte tekrar hesaplamak yerine, kasaya bir kez "her şeyi CSS parasıyla fiyatla, ben cihaz parasına çeviririm" dersiniz. Sonra rahatça CSS'te düşünürsünüz.

Somutlaştıralım. `dpr = 2` iken canvas 600 nokta geniş. Siz merkeze bir nokta koymak isteyip `ctx.fillRect(150, 75, 1, 1)` yazıyorsunuz, CSS uzayında. `ctx.scale(2, 2)` sayesinde bu çağrı fiziksel olarak (300, 150) cihaz pikseline denk düşüyor ve 2×2 cihaz pikseli boyanıyor. Siz 150 dediniz, tuval 300'e çizdi, ama siz bunu hiç bilmediniz. CSS uzayında düşünmeye devam ettiniz.

Faydası şu: çizim kodunuz `dpr`'dan tamamen habersiz olur. Aynı `draw()` fonksiyonu 1x ekranda da, 2x'te de, 3x'te de değişmeden çalışır. Kur tek bir yerde, kurulumda uygulanır; gerisi onu unutur.

```ts
// En küçük kullanım örneği (repo'daki demo değil; demo'nun tamamı aşağıda)
import { setupHiDPICanvas } from "./hidpi";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const ctx = setupHiDPICanvas(canvas, 300, 150);

// Bu fonksiyonun devicePixelRatio'dan hiç haberi yok.
// Her şeyi CSS koordinatında konuşuyor, kur zaten sabitlendi.
function draw(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, 300, 150);
  ctx.fillStyle = "#7c3aed";
  ctx.font = "13px system-ui";
  ctx.fillText("keskin metin", 20, 30); // 20, 30 → CSS pikseli
  ctx.strokeRect(20, 50, 260, 80);
}

draw(ctx);
```

Bu ayrım küçük bir konfor gibi görünür ama projeniz büyüdükçe altın değerinde. Çizim mantığınızın hiçbir yerinde `devicePixelRatio` geçmez. Fizik, layout, hit-test hepsi CSS uzayında. Cihaz uzayı sadece iki yerde yaşar: `canvas.width` ataması ve `ctx.scale`. Bug arıyorsanız bakacağınız yer bellidir.

### Keskinliğin İki Düşmanı: Yarım Piksel ve Bulanık Ölçekleme

Kuru doğru kurdunuz diyelim. Canvas artık cihazla birebir. Peki 1 piksellik ince bir çizgi çizdiniz ve hâlâ 2 piksel kalınlığında, soluk gri görünüyor. Neden?

Bu, dpr ile ilgisi olmayan, canvas'ın kadim bir tuhaflığı. Ama HiDPI'da daha da sinsileşir, o yüzden burada.

Canvas koordinatları pikselin köşelerini işaret eder, merkezini değil. `ctx.lineWidth = 1` ile `x = 20`'de dikey bir çizgi çizdiğinizde, çizgi 20 koordinatının tam üstüne oturur. Ama 20, iki pikselin sınırıdır: 19. piksel ile 20. pikselin arası. 1 piksellik fırça bu sınırın iki yanına yarımşar piksel taşar. Tarayıcı da tek bir keskin çizgi çizemeyeceği için iki komşu pikseli %50 opaklıkta boyar. Sonuç: iki piksel geniş, soluk bir hayalet.

Çözüm, çizgiyi pikselin ortasına, yarım piksele hizalamak. `20.5` dediğinizde fırça 20. pikselin tam üstünü doldurur, tek keskin çizgi çıkar.

```ts
// 1px keskin çizgiler için 0.5 hizalama.
// Tam sayı → +0.5 (ortala); zaten .5 olan değer değişmez.
export function alignHalfPixel(x: number): number {
  return Math.floor(x) + 0.5;
}
```

Kullanımı:

```ts
import { alignHalfPixel } from "./scale";

// Bulanık: çizgi piksel sınırına oturur, iki piksele yayılır
ctx.beginPath();
ctx.moveTo(40, 10);
ctx.lineTo(40, 140);
ctx.stroke();

// Keskin: çizgi pikselin ortasına oturur, tek piksel kalır
const x = alignHalfPixel(40); // 40.5
ctx.beginPath();
ctx.moveTo(x, 10);
ctx.lineTo(x, 140);
ctx.stroke();
```

İkinci düşman ölçekleme kalitesi. Canvas'a küçük bir görüntü koyup büyük çizdiğinizde tarayıcı varsayılan olarak yumuşatır (`imageSmoothingEnabled = true`). Fotoğraf için doğru tercih. Ama piksel-art (pixel art) bir sprite çiziyorsanız felaket: keskin kenarlar bulanık bir lapaya döner. Piksel-art keskinliğini istiyorsanız yumuşatmayı kapatın.

```ts
ctx.imageSmoothingEnabled = false; // piksel-art keskin kalsın
```

Repo'daki demo bu bayrağı iki ayrı yerde, iki ayrı amaçla kullanıyor; kafa karıştırmasın diye şimdiden söyleyeyim. Sahnenin sonundaki piksel-art grid'inden hemen önce `false` yapılıyor (keskin kalsın diye). Naif tarafta ise bilerek `true` bırakılıyor, çünkü orada tam olarak tarayıcının bulanık büyütmesini taklit etmeye çalışıyoruz. Aynı bayrak, biri kaçınılan biri kovalanan iki sonuç.

Bir tuzak, ve bunu bu seride sprite batching yazısını yazarken canlı yemiştim: `canvas.width`'e her yazdığınızda 2D context'in bütün durumu fabrika ayarlarına döner. `imageSmoothingEnabled` dahil. Yeniden boyutlandırmadan sonra tekrar ayarlamazsanız sprite'lar bir anda bulanıklaşır, siz de "ama ben kapatmıştım" diye yarım saat bakarsınız. Kurala dönüştü bende: canvas'ı yeniden boyutlandırdıysan smoothing ayarını tazele.

### Ekranlar Arası Taşımak: dpr Değişebilir

Şimdiye kadar `devicePixelRatio`'yu bir kez okuyup kurduk. Sabitmiş gibi davrandık. Değil.

Kullanıcı pencereyi retina dizüstünden harici bir normal monitöre sürüklerse, `devicePixelRatio` 2'den 1'e düşer. Tarayıcı zoom'unu değiştirirse kur küsuratlanır. Bu olduğunda sizin 600 noktalık tuvaliniz artık 300 noktalık bir alana çizilmeye çalışır, ya da tersi. Ölçek bozulur, keskinlik gider.

Peki bu değişimi nasıl yakalarız? `resize` event'i her zaman ateşlenmez, çünkü pencere boyutu değişmemiş olabilir, sadece kur değişmiştir. Doğru araç `matchMedia` ile bir çözünürlük sorgusu kurmak.

Fikir zekice: mevcut `dpr`'ı bir media query'ye gömüyoruz. "`(resolution: 2dppx)`" sorgusu, kur tam olarak 2 iken eşleşir. Kur bundan saptığı an sorgu eşleşmeyi bırakır ve `change` ateşlenir. O anda yeni kuru okuyup bir sonraki değer için yeni bir sorgu kuruyoruz.

```ts
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
```

`{ once: true }` bilerek. Media query nesnesini her kur için bir kereliğine kullanıyoruz; değişim gelince eskisini bırakıp yeni kur için taze bir sorgu kuruyoruz. Aksi halde 2dppx sorgusu 1'e düştükten sonra da elinizde kalır, artık işe yaramaz.

Değişimi yakaladıktan sonra tuvali yeniden kurmamız gerek. Ama burada bir incelik var: `canvas.width`'e yazmak, aynı değeri yazsanız bile, tuvali temizler. Boşuna yeniden kurup her kareyi silmemek için, gerçekten değişip değişmediğini önce kontrol ederiz.

```ts
// NOT: bu fonksiyon repo'da duruyor ama demo onu kullanmıyor.
// Demonun tuvalleri sabit CSS ölçüsünde (320×200) ve dpr anahtarı her
// değişimde tuvali zaten baştan kuruyor. resizeToDisplaySize farklı bir
// desen içindir: CSS ile boyutlanan (width: 100%, esnek layout) bir canvas'ı
// her karede/ResizeObserver tetiğinde kontrol edip yalnızca gerçekten
// değiştiyse yeniden kurmak. Kendi projenizde muhtemelen bu desendesiniz.

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
```

Şu `setTransform(dpr, 0, 0, dpr, 0, 0)` satırı, `setTransform(1,0,0,1,0,0)` + `scale(dpr, dpr)` ikilisinin tek satırlık hali. Neden tek satır tercih ettim? Çünkü `scale`, mevcut transform'un üstüne biner. `canvas.width`'e yazınca transform kendiliğinden identity'ye döner ama ben yine de açıkça `setTransform` kullanıyorum; başka bir yerde birinin transform'a dokunmuş olma ihtimaline karşı garanti. Öğrendiğim bir refleks: canvas'ta transform'u varsaymayınca, üst üste binen ölçek bug'larını hiç yaşamıyorsunuz.

### Bedelini Ölçmek: dpr² Fill-Rate

Buraya kadar keskinliği bedava bir kazançmış gibi anlattım. Değil. Şimdi faturayı çıkaralım.

Retina'da (`dpr = 2`) canvas'ınız genişlikte 2 kat, yükseklikte 2 kat nokta içeriyor. Toplam piksel 2×2 = 4 kat. `dpr = 3` telefonda 3×3 = 9 kat. Kur bir boyutta değil, iki boyutta birden çarpıyor. Maliyet doğrusal değil, karesel.

```ts
// dpr artınca boyanan piksel sayısı karesel artar.
// dpr=2 → 4× piksel, dpr=3 → 9× piksel.
export function pixelRatio(dpr: number): number {
  return dpr * dpr;
}
```

Bu neden önemli? Çünkü GPU'nun her kare boyaması gereken piksel sayısı, yani **fill-rate**, tam olarak bu kadar artar. Bu seride sprite batching yazısında çizim çağrısı sayısının duvara tosladığını, WebGPU compute particles yazısında ise piksel doldurma maliyetinin sınır olduğunu konuşmuştuk. HiDPI, o tartışmanın görünmez bir çarpanı. Aynı sahne, aynı draw call sayısı, ama retina'da GPU dört kat piksel boyuyor.

Rakama dökelim. 400×300 CSS pikselilik bir canvas'ı düşünün, saniyede 60 kare çiziyorsunuz. Sağdaki iki sütun aritmetik değil; birazdan kuracağımız bench'ten, bu yazıyı yazarken benim makinemde çıkan gerçek sayılar.

| dpr | İç çözünürlük | Kare başına piksel | Saniyede piksel | Ölçülen ms/kare | Ölçülen oran (1x'e) |
|---|---|---|---|---|---|
| 1 | 400×300 | 120.000 | 7,2 milyon | 0,186 | 0,90× |
| 2 | 800×600 | 480.000 | 28,8 milyon | 0,784 | 3,78× |
| 3 | 1200×900 | 1.080.000 | 64,8 milyon | 1,742 | 8,40× |

Aritmetik 1 / 4 / 9 diyor, ölçüm 0,90 / 3,78 / 8,40 diyor. Yakın ama birebir değil, ve bu fark tesadüf değil; bir sonraki bölümün konusu tam olarak o.

`dpr = 3`'te GPU, 1x'e göre dokuz kat fazla piksel dolduruyor. Basit bir 2D sahnede fark etmez. Ama full-screen bir shader, ağır blur/gölge efektleri, ya da binlerce sprite'lı bir sahnede bu çarpan sizi 60 FPS'ten alıp 20'ye bırakabilir.

Bu yüzden pek çok WebGL demosu (bu serideki bazıları dahil) iç çözünürlüğü `Math.min(devicePixelRatio, 2)` ile sınırlar. Mantık dürüst bir taviz: 2x ile 3x arasındaki keskinlik farkını çıplak gözle görmek zor, ama fill-rate farkı 4x'ten 9x'e fırlıyor. Üst sınır koymak, telefonlarda pili ve kare hızını kurtarır.

```ts
// Çok yoğun sahneler için kuru kırp: keskinlik biraz düşer, fill-rate rahatlar
const cappedDpr = Math.min(window.devicePixelRatio || 1, 2);
const ctx = setupHiDPICanvas(canvas, 400, 300, cappedDpr);
```

Karar sizin: metin ağırlıklı, statik bir arayüzde tam `dpr` kullanın, keskinlik bedava sayılır. Her kare yeniden çizilen, GPU'yu zorlayan bir sahnedeyse kuru 2'de kesmek çoğu zaman doğru taviz. Keskinlik bir spektrum, sabit bir hedef değil.

### Aritmetiği Ölçüye Bağlamak: npm run bench

Yukarıdaki tablonun sol yarısı çarpma işleminden ibaret. `400 × 300 × 9 = 1.080.000`. Buna kimse itiraz etmez ama kimse de ikna olmaz. "Piksel sayısı dokuza katlanıyor" başka şey, "işin gerçekten dokuz kat pahalılaşıyor" başka şey. İkincisini iddia ediyorsak ölçmemiz gerek.

Sorun şu: ölçümü headless bir Node ortamında yapmak istiyorum ki `npm run bench` diyen herkes aynı sayıyı görebilsin. Ama Node'da canvas yok, GPU yok, `fillRect` yok.

Çözüm, maliyetin nereden geldiğini hatırlamakta. Bir tuvali boyamak, özünde, cihaz pikseli sayısı kadar RGBA byte'ını belleğe yazmaktır. O zaman gerçek bir tipli dizi (typed array) üzerinde aynı işi yaparız: `clearRect` yerine buffer'ı sıfırla, `fillRect` yerine buffer'a opak renk yaz. GPU'nun mutlak hızını ölçmüş olmayız, zaten amaç o değil. Ölçtüğümüz şey **eğilim**: `dpr` büyüyünce iş yükü nasıl büyüyor.

Önce tablonun aritmetik yarısı. Makaledeki fill-rate tablosunu elle yazmak yerine kod üretiyor, ki yanlış çarpma yapma ihtimalim kalmasın:

```ts
// bench.ts — dpr² fill-rate'in hem aritmetik hem ölçülmüş kanıtı.
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
```

Şimdi asıl kısım. Buffer'ı döngünün dışında bir kez ayırıyoruz, çünkü ölçmek istediğim şey boyama maliyeti; `new Uint8ClampedArray` tahsisinin maliyeti ölçüme karışırsa `dpr = 3` satırı haksız yere şişer.

```ts
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
```

Son parça, her `dpr` için ölçümü alıp `dpr = 1` tabanına oranlıyor. Beklenen değeri de yanına koyuyorum, çünkü bir bench'in en kıymetli sütunu "ölçtüğüm" değil, "ölçtüğümün beklediğimden ne kadar saptığı":

```ts
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
```

`src/bench-cli.ts` bu ikisini çağırıp terminale basıyor, `package.json` da onu bir script'e bağlıyor:

```json
"bench": "vite-node src/bench-cli.ts"
```

`npm run bench` dediğimde bu yazıyı yazarken aldığım çıktı, olduğu gibi:

```
fill-rate tablosu (400×300 CSS, 60 FPS) — saf aritmetik
  dpr  iç çözünürlük   kare başı piksel   saniyede piksel
    1        400×300          120,000            7.2M
    2        800×600          480,000           28.8M
    3       1200×900        1,080,000           64.8M

ölçülen maliyet (clear+fill, 200 kare) — dpr² eğilimi doğrulaması
  dpr  iç çözünürlük     ms/kare   1x'e oran   beklenen dpr²
    1        400×300      0.186      0.90×            1×
    2        800×600      0.784      3.78×            4×
    3       1200×900      1.742      8.40×            9×
```

Şimdi bu tabloyu dürüstçe okuyalım, çünkü asıl öğretici kısım sapmalar.

Önce `dpr = 1` satırı. Beklenen 1×, ölçülen 0,90×. Ama bu satır tanımı gereği kendisiyle karşılaştırılıyor; nasıl 1'den sapıyor? Çünkü `costTrend` tabanı ayrı bir `measureFillCost` çağrısıyla alıyor, sonra döngüde `dpr = 1`'i bir kez daha ölçüyor. İki ölçüm arasında JIT ısınıyor, ikincisi biraz daha hızlı çıkıyor. Yani o `0,90×` bir bug değil, **gürültü tabanı**: bu makinede aynı işi iki kez ölçtüğümde aradaki fark bu kadar. Bunu bilmek, öteki satırları okurken elimizde bir cetvel olması demek.

O cetvele göre `3,78×` ve `8,40×`, beklenen `4×` ve `9×`'un yaklaşık %5-7 altında. Beklenenin *altında* kalması mantıklı: `dpr = 1`'de buffer 480 KB, işlemcinin önbelleğine rahat sığıyor ama sabit maliyetler (döngü kurulumu, çağrı yükü) toplam sürenin içinde görece büyük bir pay tutuyor. `dpr = 3`'te buffer 4,3 MB'a çıkıyor, sabit maliyetler aynı kalıp asıl iş büyüyor, oran da asimptotik olarak `dpr²`'ye yaklaşıyor ama tam oturmuyor.

Bir de koşumlar arası oynama var; makineyi meşgul edip aynı komutu tekrar çalıştırdığımda `0,95 / 3,85 / 8,73` gördüm, soğuk bir ilk koşumda `0,85 / 3,42 / 7,72`. Bu yüzden bench çıktısına "işte kesin sayı" gözüyle bakmıyorum. Bakılacak şey şu: `dpr` 1'den 2'ye çıkarken maliyet ikiye değil dörde yakın katlanıyor, 3'e çıkarken üçe değil dokuza yakın. Karesel eğilim, ölçümün gürültüsünden çok daha büyük.

Yani `pixelRatio(dpr) = dpr * dpr` üç kelimelik bir fonksiyon, ama arkasında duran iddia gerçek. Bir sayfada "retina neden ağır" diye tartışmaya girmeden önce `npm run bench` çalıştırmak, tartışmayı bitiren en ucuz yol.

### Test Edilebileni Test Etmek: Saf Ölçekleme Matematiği

Headless bir vitest ortamında ne `canvas` var ne `window.devicePixelRatio`. `ctx.scale`'i test edemezsiniz, `matchMedia` yoktur. Peki o zaman ne test ederiz?

Hataların yaşadığı yeri. Ve hatalar `ctx.scale` çağrısında değil, ona verdiğimiz sayıların hesabında yaşar: yuvarlama, kur çarpımı, yarım piksel hizalaması, karesel oran. Bütün bu matematiği en baştan saf fonksiyonlara ayırmamızın sebebi buydu. Şimdi karşılığını alıyoruz. `dpr`'ı parametre olarak geçtiğimize dikkat edin; hiçbir test global `devicePixelRatio`'ya bağımlı değil, o yüzden hepsi deterministik.

```ts
import { describe, it, expect } from "vitest";
import {
  deviceSize,
  cssToDevice,
  deviceToCss,
  alignHalfPixel,
  pixelRatio,
} from "../src/scale";

describe("deviceSize", () => {
  it("dpr=1'de CSS boyutu aynen kalır", () => {
    expect(deviceSize(300, 150, 1)).toEqual({ w: 300, h: 150 });
  });

  it("dpr=2'de her kenar ikiye katlanır", () => {
    expect(deviceSize(300, 150, 2)).toEqual({ w: 600, h: 300 });
  });

  it("dpr=3'te her kenar üçe katlanır", () => {
    expect(deviceSize(400, 300, 3)).toEqual({ w: 1200, h: 900 });
  });

  it("küsuratlı CSS boyutunu tam sayıya yuvarlar", () => {
    // 300.4 * 1.5 = 450.6 → 451 ; 150.2 * 1.5 = 225.3 → 225
    expect(deviceSize(300.4, 150.2, 1.5)).toEqual({ w: 451, h: 225 });
  });
});
```

Kur çevirisi bir gidiş-dönüş testini hak ediyor. CSS'ten cihaza çevirip geri döndüğünüzde başladığınız değere dönmelisiniz:

```ts
describe("cssToDevice / deviceToCss", () => {
  it("cssToDevice kur ile çarpar", () => {
    expect(cssToDevice(100, 2)).toBe(200);
    expect(cssToDevice(100, 3)).toBe(300);
  });

  it("deviceToCss kuru geri alır", () => {
    expect(deviceToCss(200, 2)).toBe(100);
  });

  it("gidiş-dönüş başlangıç değerine döner", () => {
    for (const dpr of [1, 1.5, 2, 3]) {
      const px = 137;
      expect(deviceToCss(cssToDevice(px, dpr), dpr)).toBeCloseTo(px);
    }
  });
});
```

Yarım piksel hizalaması, spec'i iki cümlelik bir fonksiyon ama tam da ince çizgi bug'larının kaynağı. İki davranışı da çiviliyoruz: tam sayı ortalanır, zaten ortalanmış değer olduğu gibi kalır.

```ts
describe("alignHalfPixel", () => {
  it("tam sayıyı yarım piksele ortalar", () => {
    expect(alignHalfPixel(40)).toBe(40.5);
    expect(alignHalfPixel(0)).toBe(0.5);
  });

  it("zaten .5 olan değeri değiştirmez", () => {
    expect(alignHalfPixel(40.5)).toBe(40.5);
  });

  it("küsuratlı değeri aşağı tabana oturtup ortalar", () => {
    expect(alignHalfPixel(40.2)).toBe(40.5);
    expect(alignHalfPixel(40.9)).toBe(40.5);
  });
});
```

Ve en sevdiğim, karesel oran. Keskinliğin bedelini tek satırda ispatlıyor:

```ts
describe("pixelRatio", () => {
  it("dpr=2 dört kat piksel demektir", () => {
    expect(pixelRatio(2)).toBe(4);
  });

  it("dpr=3 dokuz kat piksel demektir", () => {
    expect(pixelRatio(3)).toBe(9);
  });

  it("kuru ikiye katlamak pikseli dörde katlar", () => {
    const dpr = 1.5;
    expect(pixelRatio(dpr * 2)).toBeCloseTo(pixelRatio(dpr) * 4);
  });
});
```

Son test bir cümleyi matematiğe çeviriyor: kuru ikiye katlarsan piksel dörde katlanır. Yazının fill-rate uyarısının tamamı bu tek `expect` içinde duruyor. `npm test` bu 13 testi milisaniyeler içinde çalıştırıyor; bench ise aynı iddianın pahalı ama ikna edici kardeşi.

Bu testlerin hiçbiri gerçekten keskin bir çizgi çizildiğini kanıtlamıyor. Onun için tarayıcıya bakmak gerek, demo tam da bunun için var. Ama beni kurulumda hataya düşüren şey hiçbir zaman `ctx.scale`'in kendisi olmadı; hep ona verdiğim sayıydı. Test edilen de o sayı.

### Demo: Yan Yana İki Tuval

Repo'daki demo, iki para birimini gözle görülür kılıyor. Yan yana iki canvas var, ikisi de aynı içeriği çiziyor: ince çizgiler, küçük metin, bir daire kenarı. Soldaki naif kurulum, sağdaki `setupHiDPICanvas` ile HiDPI.

Burada küçük bir dürüstlük notu gerekiyor. Naif tarafı gerçekten naif bırakırsam (`canvas.width = cssW`, kur yok) bulanıklığı sadece gerçek bir retina ekranda görürsünüz; normal bir monitörde iki taraf da aynı çıkar ve demo hiçbir şey anlatmaz. Bu yüzden naif tarafı simüle ediyorum: sahneyi bir kez CSS çözünürlüğünde offscreen bir tuvale çizip, sonra cihaz çözünürlüğüne büyüterek basıyorum. Tarayıcının retina'da naif bir canvas'a yaptığı şeyin birebir aynısı, ama her ekranda görünür.

```ts
// src/main.ts
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
```

Sahne fonksiyonu, yazının başından beri anlattığımız her şeyin bir arada sınandığı yer: 11px metin, 1px dikey ve yatay çizgiler, bir daire kenarı, bir de smoothing kapalı piksel-art grid'i. Dikkat: bu fonksiyon `dpr`'ı hiç görmüyor. Aynı fonksiyon hem naif hem HiDPI tuvale çiziliyor, tek fark onu besleyen context'in nasıl kurulduğu.

```ts
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
```

İki render fonksiyonu yan yana durunca fark tek bakışta anlaşılıyor. HiDPI tarafı üç satır: kur, çiz, bitti. Naif taraf ise vektörü bir kez düşük çözünürlükte bitmap'e sabitliyor, sonra o bitmap'i esnetiyor. Bilgi çoktan kaybolmuş oluyor; `drawImage` onu geri getiremiyor, sadece bulanık bir tahminle dolduruyor.

```ts
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
```

Geriye HUD ve kablolama kalıyor. HUD, fill-rate tablosunu ekranda canlı tutuyor: `dpr`'ı 3'e çektiğinizde kare başına boyanan piksel sayacının dokuza katlandığını görmek, tabloyu bir anda somut yapıyor.

```ts
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
```

`npm run dev` ile açın (`file://` ile açmayın, boş ekran gelir), 1 / 2 / 3 butonları arasında gezinin, mümkünse pencereyi başka bir monitöre sürükleyin. Kurun değiştiği an konsola düşen satırı görürsünüz.

### Özetle:

1. Ekranın iki para birimi var: CSS pikseli (senin konuştuğun) ve cihaz pikseli (panelin gerçek noktası). `devicePixelRatio` ikisi arasındaki kur.
2. Canvas bir bitmap, metin gibi vektörden yeniden çizilemez. Kuru hesaba katmazsanız tarayıcı tuvali büyütür ve bulanıklaşır.
3. İç çözünürlük (`canvas.width/height`) cihaz pikseli olmalı, görünen boyut (`style.width/height`) CSS pikseli. İkisi ayrı, ikisi bilinçli.
4. `ctx.scale(dpr, dpr)` kuru bir kez sabitler. Sonrasında bütün çizim CSS uzayında kalır; çizim kodu `devicePixelRatio`'yu hiç görmez.
5. 1px keskin çizgi için yarım piksele hizala (`alignHalfPixel`). Piksel-art için `imageSmoothingEnabled = false`.
6. `dpr` sabit değil. Ekranlar arası taşımada ve zoom'da değişir; `matchMedia((resolution: Xdppx))` ile yakala.
7. `canvas.width`'e yazmak tuvali temizler ve context durumunu (smoothing dahil) sıfırlar. Yeniden boyutlandırdıktan sonra transform ve smoothing'i tazele.
8. Keskinlik bedava değil: fill-rate `dpr²` ile artar. Yoğun sahnelerde kuru `Math.min(dpr, 2)` ile kırpmak dürüst bir taviz.
9. Karesel maliyet bir varsayım değil; `npm run bench` ile ölçüldü. Bu makinede `dpr` 1→2→3 giderken maliyet `3,78×` ve `8,40×` çıktı, beklenen `4×` ve `9×`'un birkaç puan altında. Sapmanın kaynağı ölçüm gürültüsü ve sabit maliyetler, eğilimin kendisi değil.
10. Test edilecek şey `ctx.scale` değil, ona verdiğin sayılar. Ölçekleme matematiğini saf fonksiyonlara ayır, `dpr`'ı parametre geç, headless test et.

Kurulum yardımcıları, `matchMedia` dinleyicisi, iki tuvallı demo, bench ve testlerin hepsi repoda duruyor. Sayıların tuttuğunu görmek isterseniz `npm test`, karesel maliyeti kendi makinenizde ölçmek isterseniz `npm run bench`, bulanıklık ile keskinliği kendi ekranınızda karşılaştırmak isterseniz `npm run dev` yeterli.

Bir de şu kaldı aklımda. Fizik yazısındaki o "birebir olunca ölçekleme kalmaz" cümlesini düzeltirken, kendi eski kodumdaki bir bulanıklığı da düzeltmiş oldum. Tuhaf olan, o bulanıklığı aylarca görmemem. Çünkü daireler, dolu renkler, kalın çizgiler kuru affediyor; keskin olması gerekeni onların arkasında göremiyorsunuz. Ama bir tasarımı retina'da ilk kez ince bir çizgiyle ya da 11 puntoluk bir metinle açtığınızda, affedilmiş ne kadar eski bulanıklık varsa hepsi bir anda önünüze çıkıyor. En sağlam test aracı bu yüzden gözü en çok yoran içeriktir: ince çizgi ve küçük yazı. Onlar keskinse, gerisi zaten keskindir. 🔍

---

### 🚀 Serinin ve Konunun Devamı
Canvas 2D ve web oyun mimarisi serisindeki sonraki teknik duraklarımız:
- 📌 **[Metronomlu Fizik: Sabit Adımlı Oyun Döngüsü ve Render Enterpolasyonu](https://medium.com/@mkare)** — *Farklı ekran tazeleme hızlarında (60Hz vs 144Hz) oyun fiziğinin hızlanmasını engelleyen deterministik döngü.*
- 📌 **[Çöpü Değil, Bardağı Geri Ver: Canvas'ta Nesne Havuzları ve Sıfır-Ayırmalı Döngü](https://medium.com/@mkare)** — *Garbage Collector takılmalarını (GC jank) nesne havuzları (object pools) ile yok etme.*
- 📌 **[Bütün Masayı Silmeye Gerek Yok: Canvas 2D'de Kirli Dikdörtgen Tekniği](https://medium.com/@mkare)** — *Statik sahnelerde tüm tuvali temizlemek yerine sadece hareket eden alanı yeniden çizme optimizasyonu.*

---

### 👋 Yazar Hakkında
Ben **Mustafa Morbel** — 14 yılı aşkın süredir modern web teknolojileri, tarayıcı render motorları, WebGL ve yapay zekâ iş akışları üzerine mühendislik yapıyorum.

* Çalışan demo kodları, benchmark harness'ı ve testler için **[GitHub (@mkare)](https://github.com/mkare)** profilimi ziyaret edebilirsiniz.
* Yeni teknik rehberler ve mimari paylaşımlar için **[LinkedIn](https://linkedin.com/in/mustafamorbel)** ve **[X / Twitter (@mustafamorbel)](https://x.com/mustafamorbel)** üzerinden takibe alabilirsiniz.
* Retina ekranlarda karşılaştığınız tuval ölçekleme deneyimlerinizi yorumlarda paylaşmayı, faydalı bulduysanız 👏 alkış bırakmayı unutmayın!
