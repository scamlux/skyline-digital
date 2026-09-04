import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Фирменные цвета — те же, что в public/brand/colors.json. */
export const BRAND = {
  night: "#1A2238",
  apricot: "#FFAE5C",
  afterglow: "#E8517C",
  paper: "#F4F6FA",
  ink: "#1A2238",
  inkSoft: "#4A5470",
  inkFaint: "#7E88A2",
  onNight: "#EEF1F8",
  onNightSoft: "#98A2BE",
  line: "#D5DBE7",
  lineNight: "#2E3855",
};

/** Вторая шкура — свободная, «вайбкодерская». Тот же бренд, другая подача. */
export const VIBE = {
  bg: "#0F1424",
  bgAlt: "#161C30",
  chrome: "#1E2740",
  text: "#E6EBF7",
  textSoft: "#8E9AB8",
  green: "#6BE3C0",
  amber: "#FFAE5C",
  pink: "#E8517C",
  line: "#28324F",
};

/** Размеры холстов под площадки. */
export const CANVAS = {
  post: { w: 1080, h: 1350 }, // 4:5 — максимальная площадь в ленте Instagram
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

const FAMILY = {
  unbounded: "Unbounded",
  "golos-text": "Golos Text",
  "jetbrains-mono": "JetBrains Mono",
};

/**
 * Шрифты вшиваются в HTML как base64, а не тянутся из сети. Иначе рендер
 * зависит от доступа к Google Fonts и в CI молча падает на системный шрифт,
 * а это замечаешь уже в опубликованном посте.
 */
export function fontFaceCss() {
  const dir = join(HERE, "fonts");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".woff2")) : [];
  if (!files.length) {
    console.error("Нет шрифтов. Сначала: node scripts/content/fonts/fetch.mjs");
    process.exit(1);
  }
  return files
    .map((f) => {
      const m = f.match(/^(.+)-(cyrillic|latin)-(\d+)-normal\.woff2$/);
      if (!m) return "";
      const [, slug, subset, weight] = m;
      const family = FAMILY[slug];
      if (!family) return "";
      const b64 = readFileSync(join(dir, f)).toString("base64");
      const range =
        subset === "cyrillic"
          ? "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"
          : "U+0000-00FF,U+0131,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-21BB,U+2212,U+2215";
      return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format("woff2");unicode-range:${range};}`;
    })
    .join("\n");
}

export const studioCss = (w, h) => `
${fontFaceCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px}
body{
  font-family:"Golos Text",sans-serif;
  -webkit-font-smoothing:antialiased;
  text-rendering:geometricPrecision;
  overflow:hidden;
}
.slide{
  position:relative;width:${w}px;height:${h}px;
  display:flex;flex-direction:column;
  padding:${Math.round(w * 0.083)}px;
  overflow:hidden;
}
.slide.dark{background:${BRAND.night};color:${BRAND.onNight}}
.slide.light{background:${BRAND.paper};color:${BRAND.ink}}

.eyebrow{
  font-family:"JetBrains Mono",monospace;font-weight:700;
  font-size:${Math.round(w * 0.0204)}px;letter-spacing:.16em;text-transform:uppercase;
}
.dark .eyebrow{color:${BRAND.apricot}}
.light .eyebrow{color:${BRAND.afterglow}}

h1{
  font-family:"Unbounded",sans-serif;font-weight:700;
  font-size:${Math.round(w * 0.0787)}px;line-height:1.06;letter-spacing:-.025em;
  text-wrap:balance;
}
h2{
  font-family:"Unbounded",sans-serif;font-weight:600;
  font-size:${Math.round(w * 0.0509)}px;line-height:1.12;letter-spacing:-.02em;
  text-wrap:balance;
}
.body{
  font-size:${Math.round(w * 0.0324)}px;line-height:1.45;font-weight:400;
  max-width:${Math.round(w * 0.8)}px;
}
.dark .body{color:${BRAND.onNightSoft}}
.light .body{color:${BRAND.inkSoft}}
.grow{flex:1}
.stack{display:flex;flex-direction:column;gap:${Math.round(w * 0.028)}px}

.foot{
  display:flex;justify-content:space-between;align-items:center;
  font-family:"JetBrains Mono",monospace;font-weight:400;
  font-size:${Math.round(w * 0.0204)}px;letter-spacing:.08em;text-transform:uppercase;
  padding-top:${Math.round(w * 0.028)}px;
}
.dark .foot{color:${BRAND.onNightSoft};border-top:2px solid ${BRAND.lineNight}}
.light .foot{color:${BRAND.inkFaint};border-top:2px solid ${BRAND.line}}
.foot b{font-weight:700}
.dark .foot b{color:${BRAND.apricot}}
.light .foot b{color:${BRAND.ink}}

.swipe{
  font-family:"JetBrains Mono",monospace;font-weight:700;
  font-size:${Math.round(w * 0.0204)}px;letter-spacing:.12em;text-transform:uppercase;
}
.dark .swipe{color:${BRAND.apricot}}
.light .swipe{color:${BRAND.afterglow}}

/* крупная цифра */
.figure{
  font-family:"Unbounded",sans-serif;font-weight:700;
  font-size:${Math.round(w * 0.185)}px;line-height:.92;letter-spacing:-.045em;
  font-variant-numeric:tabular-nums;
}
.dark .figure{color:${BRAND.apricot}}
.light .figure{color:${BRAND.ink}}
.figure .unit{font-size:.38em;letter-spacing:-.02em}

/* нумерованный список */
.rows{display:flex;flex-direction:column;gap:${Math.round(w * 0.026)}px;width:100%}
.row{display:flex;gap:${Math.round(w * 0.028)}px;align-items:flex-start;padding-bottom:${Math.round(w * 0.026)}px}
.dark .row{border-bottom:2px solid ${BRAND.lineNight}}
.light .row{border-bottom:2px solid ${BRAND.line}}
.row:last-child{border-bottom:0;padding-bottom:0}
.row .n{
  font-family:"JetBrains Mono",monospace;font-weight:700;
  font-size:${Math.round(w * 0.0231)}px;letter-spacing:.06em;padding-top:${Math.round(w * 0.009)}px;
  min-width:${Math.round(w * 0.055)}px;
}
.dark .row .n{color:${BRAND.apricot}}
.light .row .n{color:${BRAND.afterglow}}
.row .t{
  font-family:"Unbounded",sans-serif;font-weight:600;
  font-size:${Math.round(w * 0.0333)}px;line-height:1.2;letter-spacing:-.015em;
  margin-bottom:${Math.round(w * 0.011)}px;
}
.row .d{font-size:${Math.round(w * 0.0269)}px;line-height:1.4}
.dark .row .d{color:${BRAND.onNightSoft}}
.light .row .d{color:${BRAND.inkSoft}}

/* цены */
.price-row{display:flex;justify-content:space-between;align-items:baseline;gap:${Math.round(w * 0.03)}px;padding-bottom:${Math.round(w * 0.024)}px}
.dark .price-row{border-bottom:2px solid ${BRAND.lineNight}}
.light .price-row{border-bottom:2px solid ${BRAND.line}}
.price-row:last-child{border-bottom:0}
.price-row .what{font-family:"Unbounded",sans-serif;font-weight:600;font-size:${Math.round(w * 0.0333)}px;letter-spacing:-.015em}
.price-row .val{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.037)}px;white-space:nowrap;font-variant-numeric:tabular-nums}
.dark .price-row .val{color:${BRAND.apricot}}
.light .price-row .val{color:${BRAND.afterglow}}

/* сравнение двух блоков */
.compare{display:grid;grid-template-columns:1fr 1fr;gap:${Math.round(w * 0.03)}px;width:100%}
.pane{padding:${Math.round(w * 0.037)}px;display:flex;flex-direction:column;gap:${Math.round(w * 0.018)}px;min-height:${Math.round(w * 0.33)}px}
.dark .pane{border:2px solid ${BRAND.lineNight}}
.light .pane{border:2px solid ${BRAND.line}}
.pane.hi{border-color:${BRAND.apricot}}
.pane .cap{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.0194)}px;letter-spacing:.14em;text-transform:uppercase}
.dark .pane .cap{color:${BRAND.onNightSoft}}
.light .pane .cap{color:${BRAND.inkFaint}}
.pane.hi .cap{color:${BRAND.apricot}}
.pane .big{font-family:"Unbounded",sans-serif;font-weight:700;font-size:${Math.round(w * 0.065)}px;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
.pane .sub{font-size:${Math.round(w * 0.0259)}px;line-height:1.35}
.dark .pane .sub{color:${BRAND.onNightSoft}}
.light .pane .sub{color:${BRAND.inkSoft}}

/* кейс: скриншот обрезается сверху, чтобы не тащить подвал чужого сайта */
.shot{
  width:100%;height:${Math.round(w * 0.46)}px;
  border-radius:2px;object-fit:cover;object-position:top center;display:block;
}
.dark .shot{border:2px solid ${BRAND.lineNight}}
.light .shot{border:2px solid ${BRAND.line}}
.tags{display:flex;flex-wrap:wrap;gap:${Math.round(w * 0.013)}px}
.tag{
  font-family:"JetBrains Mono",monospace;font-weight:400;
  font-size:${Math.round(w * 0.0194)}px;letter-spacing:.06em;
  padding:${Math.round(w * 0.008)}px ${Math.round(w * 0.015)}px;
}
.dark .tag{border:2px solid ${BRAND.lineNight};color:${BRAND.onNightSoft}}
.light .tag{border:2px solid ${BRAND.line};color:${BRAND.inkSoft}}

/* фирменная метка вместо логотипа-картинки */
.mark{display:flex;gap:${Math.round(w * 0.007)}px;align-items:center}
.mark i{display:block;width:${Math.round(w * 0.018)}px;height:${Math.round(w * 0.007)}px}
.mark i:nth-child(1){background:${BRAND.apricot}}
.mark i:nth-child(2){background:${BRAND.afterglow}}
.mark i:nth-child(3){width:${Math.round(w * 0.036)}px}
.dark .mark i:nth-child(3){background:${BRAND.onNightSoft}}
.light .mark i:nth-child(3){background:${BRAND.inkFaint}}
`;


/* ---------------------------------------------------------------------------
   Шкура «vibe»: моноширинная типографика, окно терминала, левый акцентный
   рельс. Тот же бренд — ночной фон и абрикос, — но подача разговорная.
   --------------------------------------------------------------------------- */

export const vibeCss = (w, h) => `
${fontFaceCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px}
body{
  font-family:"JetBrains Mono",monospace;
  background:${VIBE.bg};color:${VIBE.text};
  -webkit-font-smoothing:antialiased;overflow:hidden;
}
.slide{
  position:relative;width:${w}px;height:${h}px;
  display:flex;flex-direction:column;
  padding:${Math.round(w * 0.074)}px;
  background:${VIBE.bg};overflow:hidden;
}
.slide.light{background:${VIBE.bgAlt}}
.slide::before{
  content:"";position:absolute;left:0;top:0;bottom:0;width:${Math.round(w * 0.011)}px;
  background:linear-gradient(${VIBE.amber},${VIBE.pink});
}

.eyebrow{
  font-family:"JetBrains Mono",monospace;font-weight:700;
  font-size:${Math.round(w * 0.0213)}px;letter-spacing:.1em;
  color:${VIBE.green};
}
.eyebrow::before{content:"$ ";color:${VIBE.textSoft}}

h1{
  font-family:"JetBrains Mono",monospace;font-weight:700;
  font-size:${Math.round(w * 0.062)}px;line-height:1.14;letter-spacing:-.02em;
  color:${VIBE.text};text-wrap:balance;
}
h2{
  font-family:"JetBrains Mono",monospace;font-weight:700;
  font-size:${Math.round(w * 0.044)}px;line-height:1.2;letter-spacing:-.015em;
  color:${VIBE.text};text-wrap:balance;
}
.body{
  font-family:"Golos Text",sans-serif;
  font-size:${Math.round(w * 0.0315)}px;line-height:1.5;color:${VIBE.textSoft};
  max-width:${Math.round(w * 0.84)}px;
}
.grow{flex:1}
.stack{display:flex;flex-direction:column;gap:${Math.round(w * 0.024)}px}

.foot{
  display:flex;justify-content:space-between;align-items:center;
  font-family:"JetBrains Mono",monospace;font-size:${Math.round(w * 0.0194)}px;
  letter-spacing:.06em;color:${VIBE.textSoft};
  border-top:2px solid ${VIBE.line};padding-top:${Math.round(w * 0.024)}px;
}
.foot b{color:${VIBE.amber};font-weight:700}
.swipe{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.0194)}px;letter-spacing:.1em;color:${VIBE.green}}

.figure{
  font-family:"JetBrains Mono",monospace;font-weight:700;
  font-size:${Math.round(w * 0.155)}px;line-height:.95;letter-spacing:-.04em;
  color:${VIBE.amber};font-variant-numeric:tabular-nums;
}
.figure .unit{font-size:.34em;color:${VIBE.textSoft}}

.rows{display:flex;flex-direction:column;gap:${Math.round(w * 0.024)}px;width:100%}
.row{display:flex;gap:${Math.round(w * 0.024)}px;align-items:flex-start;padding-bottom:${Math.round(w * 0.024)}px;border-bottom:2px solid ${VIBE.line}}
.row:last-child{border-bottom:0;padding-bottom:0}
.row .n{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.0222)}px;color:${VIBE.green};min-width:${Math.round(w * 0.05)}px;padding-top:${Math.round(w * 0.008)}px}
.row .t{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.0296)}px;line-height:1.25;color:${VIBE.text};margin-bottom:${Math.round(w * 0.009)}px}
.row .d{font-family:"Golos Text",sans-serif;font-size:${Math.round(w * 0.0259)}px;line-height:1.42;color:${VIBE.textSoft}}

.price-row{display:flex;justify-content:space-between;align-items:baseline;gap:${Math.round(w * 0.028)}px;padding-bottom:${Math.round(w * 0.022)}px;border-bottom:2px solid ${VIBE.line}}
.price-row:last-child{border-bottom:0}
.price-row .what{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.0296)}px;color:${VIBE.text}}
.price-row .val{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.035)}px;color:${VIBE.amber};white-space:nowrap;font-variant-numeric:tabular-nums}

.compare{display:grid;grid-template-columns:1fr 1fr;gap:${Math.round(w * 0.026)}px;width:100%}
.pane{padding:${Math.round(w * 0.033)}px;border:2px solid ${VIBE.line};display:flex;flex-direction:column;gap:${Math.round(w * 0.016)}px;min-height:${Math.round(w * 0.32)}px;background:${VIBE.bgAlt}}
.pane.hi{border-color:${VIBE.amber}}
.pane .cap{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.0185)}px;letter-spacing:.1em;color:${VIBE.textSoft}}
.pane.hi .cap{color:${VIBE.amber}}
.pane .big{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.055)}px;line-height:1.05;color:${VIBE.text};letter-spacing:-.02em}
.pane .sub{font-family:"Golos Text",sans-serif;font-size:${Math.round(w * 0.025)}px;line-height:1.38;color:${VIBE.textSoft}}

.shot{width:100%;height:${Math.round(w * 0.46)}px;object-fit:cover;object-position:top center;display:block;border:2px solid ${VIBE.line}}
.tags{display:flex;flex-wrap:wrap;gap:${Math.round(w * 0.012)}px}
.tag{font-family:"JetBrains Mono",monospace;font-size:${Math.round(w * 0.0185)}px;padding:${Math.round(w * 0.007)}px ${Math.round(w * 0.014)}px;border:2px solid ${VIBE.line};color:${VIBE.textSoft}}

/* окно терминала */
.term{width:100%;border:2px solid ${VIBE.line};background:${VIBE.bgAlt}}
.term .bar{display:flex;align-items:center;gap:${Math.round(w * 0.009)}px;padding:${Math.round(w * 0.016)}px ${Math.round(w * 0.02)}px;background:${VIBE.chrome};border-bottom:2px solid ${VIBE.line}}
.term .bar i{width:${Math.round(w * 0.013)}px;height:${Math.round(w * 0.013)}px;border-radius:50%;display:block}
.term .bar i:nth-child(1){background:${VIBE.pink}}
.term .bar i:nth-child(2){background:${VIBE.amber}}
.term .bar i:nth-child(3){background:${VIBE.green}}
.term .bar span{margin-left:${Math.round(w * 0.012)}px;font-size:${Math.round(w * 0.0176)}px;color:${VIBE.textSoft};letter-spacing:.06em}
.term .body-lines{padding:${Math.round(w * 0.024)}px ${Math.round(w * 0.022)}px;display:flex;flex-direction:column;gap:${Math.round(w * 0.011)}px}
.term .ln{font-family:"JetBrains Mono",monospace;font-size:${Math.round(w * 0.0231)}px;line-height:1.4;white-space:pre-wrap;word-break:break-word}
.term .ln.cmd{color:${VIBE.text}}
.term .ln.cmd::before{content:"$ ";color:${VIBE.green}}
.term .ln.out{color:${VIBE.textSoft}}
.term .ln.ok{color:${VIBE.green}}
.term .ln.warn{color:${VIBE.amber}}
.term .ln.err{color:${VIBE.pink}}
.term .ln.comment{color:${VIBE.textSoft};opacity:.7}

/* крупное мнение */
.take{
  font-family:"JetBrains Mono",monospace;font-weight:700;
  font-size:${Math.round(w * 0.0648)}px;line-height:1.16;letter-spacing:-.025em;
  color:${VIBE.text};text-wrap:balance;
}
.take em{font-style:normal;color:${VIBE.amber}}
.take-mark{font-size:${Math.round(w * 0.13)}px;line-height:.6;color:${VIBE.line};font-weight:700}

.mark{display:flex;gap:${Math.round(w * 0.007)}px;align-items:center}
.mark i{display:block;width:${Math.round(w * 0.018)}px;height:${Math.round(w * 0.007)}px}
.mark i:nth-child(1){background:${VIBE.amber}}
.mark i:nth-child(2){background:${VIBE.pink}}
.mark i:nth-child(3){width:${Math.round(w * 0.036)}px;background:${VIBE.green}}
`;

/** Выбор шкуры по полю style в спецификации поста. */
export const baseCss = (w, h, style = "studio") =>
  style === "vibe" ? vibeCss(w, h) : studioCss(w, h);
