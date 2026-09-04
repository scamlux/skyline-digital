import type { PostTheme } from "../types";
import { fontFaceCss } from "../fonts";

/** Фирменные цвета — те же, что в public/brand/colors.json. */
export const BRAND = {
  night: "#1A2238",
  apricot: "#FFAE5C",
  afterglow: "#E8517C",
  paper: "#F4F6FA",
  paper2: "#F3EAD8",
  ink: "#1A2238",
  inkSoft: "#4A5470",
  inkFaint: "#7E88A2",
  onNight: "#EEF1F8",
  onNightSoft: "#98A2BE",
  line: "#D5DBE7",
  lineNight: "#2E3855",
};

const FONTS = [
  { family: "Unbounded", slug: "unbounded", weights: [600, 700] },
  { family: "Golos Text", slug: "golos-text", weights: [400, 500, 600] },
  { family: "JetBrains Mono", slug: "jetbrains-mono", weights: [400, 700] },
];

const css = (w: number, h: number): string => `
${fontFaceCss(FONTS)}
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

.figure{
  font-family:"Unbounded",sans-serif;font-weight:700;
  font-size:${Math.round(w * 0.185)}px;line-height:.92;letter-spacing:-.045em;
  font-variant-numeric:tabular-nums;
}
.dark .figure{color:${BRAND.apricot}}
.light .figure{color:${BRAND.ink}}
.figure .unit{font-size:.38em;letter-spacing:-.02em}

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

.price-row{display:flex;justify-content:space-between;align-items:baseline;gap:${Math.round(w * 0.03)}px;padding-bottom:${Math.round(w * 0.024)}px}
.dark .price-row{border-bottom:2px solid ${BRAND.lineNight}}
.light .price-row{border-bottom:2px solid ${BRAND.line}}
.price-row:last-child{border-bottom:0}
.price-row .what{font-family:"Unbounded",sans-serif;font-weight:600;font-size:${Math.round(w * 0.0333)}px;letter-spacing:-.015em}
.price-row .val{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.037)}px;white-space:nowrap;font-variant-numeric:tabular-nums}
.dark .price-row .val{color:${BRAND.apricot}}
.light .price-row .val{color:${BRAND.afterglow}}

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

.mark{display:flex;gap:${Math.round(w * 0.007)}px;align-items:center}
.mark i{display:block;width:${Math.round(w * 0.018)}px;height:${Math.round(w * 0.007)}px}
.mark i:nth-child(1){background:${BRAND.apricot}}
.mark i:nth-child(2){background:${BRAND.afterglow}}
.mark i:nth-child(3){width:${Math.round(w * 0.036)}px}
.dark .mark i:nth-child(3){background:${BRAND.onNightSoft}}
.light .mark i:nth-child(3){background:${BRAND.inkFaint}}

.slide.story{padding:${Math.round(w * 0.26)}px ${Math.round(w * 0.083)}px ${Math.round(w * 0.24)}px}
.slide.story .grow{justify-content:center!important;padding-bottom:0!important}
.slide.story h1{font-size:${Math.round(w * 0.098)}px}
.slide.story .body{font-size:${Math.round(w * 0.035)}px}

.hl-wrap{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:${Math.round(w * 0.028)}px;
  text-align:center;z-index:2;
}
.hl-word{
  font-family:"Unbounded",sans-serif;font-weight:700;
  font-size:${Math.round(w * 0.089)}px;line-height:1;letter-spacing:-.03em;
  text-transform:uppercase;color:${BRAND.apricot};
}
.hl-word.long{font-size:${Math.round(w * 0.07)}px}
.hl-note{
  font-family:"JetBrains Mono",monospace;font-size:${Math.round(w * 0.0222)}px;
  letter-spacing:.16em;text-transform:uppercase;color:${BRAND.onNightSoft};
}

.slide.paper{
  background:${BRAND.paper2};color:${BRAND.ink};
  background-image:radial-gradient(${BRAND.ink} 1px, transparent 1px);
  background-size:${Math.round(w * 0.0222)}px ${Math.round(w * 0.0222)}px;
}
.slide.paper .eyebrow{color:${BRAND.afterglow}}
.slide.paper .body{color:${BRAND.inkSoft}}
.slide.paper .foot{color:${BRAND.inkFaint};border-top:2px solid rgba(26,34,56,.18)}
.slide.paper .foot b{color:${BRAND.ink}}
.slide.paper .mark i:nth-child(3){background:${BRAND.inkFaint}}

.slide.framed::before,.slide.framed::after{
  content:"";position:absolute;pointer-events:none;
  width:${Math.round(w * 0.055)}px;height:${Math.round(w * 0.055)}px;
}
.slide.framed::before{
  left:${Math.round(w * 0.037)}px;top:${Math.round(w * 0.037)}px;
  border-left:3px solid ${BRAND.apricot};border-top:3px solid ${BRAND.apricot};
}
.slide.framed::after{
  right:${Math.round(w * 0.037)}px;bottom:${Math.round(w * 0.037)}px;
  border-right:3px solid ${BRAND.apricot};border-bottom:3px solid ${BRAND.apricot};
}

.word-wrap{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:${Math.round(w * 0.018)}px;text-align:center;position:relative;z-index:1;
}
.word-1{
  font-family:"JetBrains Mono",monospace;font-weight:700;
  font-size:${Math.round(w * 0.0324)}px;letter-spacing:.2em;text-transform:uppercase;
  color:${BRAND.onNightSoft};
}
.word-2{
  font-family:"Unbounded",sans-serif;font-weight:700;
  font-size:${Math.round(w * 0.111)}px;line-height:.94;letter-spacing:-.035em;
  text-transform:uppercase;color:${BRAND.apricot};text-wrap:balance;
}
.word-3{
  font-family:"Unbounded",sans-serif;font-weight:600;
  font-size:${Math.round(w * 0.0537)}px;line-height:1.08;letter-spacing:-.02em;
  text-transform:uppercase;color:${BRAND.onNight};text-wrap:balance;
}
.streaks{position:absolute;inset:0;pointer-events:none;opacity:.12;overflow:hidden}
.streaks i{
  position:absolute;display:block;height:2px;width:${Math.round(w * 0.42)}px;
  background:${BRAND.onNight};transform:rotate(-38deg);transform-origin:left center;
}

.ui-top{
  display:flex;align-items:center;gap:${Math.round(w * 0.017)}px;
  padding-bottom:${Math.round(w * 0.028)}px;border-bottom:2px solid ${BRAND.line};
}
.ui-av{
  width:${Math.round(w * 0.06)}px;height:${Math.round(w * 0.06)}px;border-radius:50%;
  background:${BRAND.night};display:flex;align-items:center;justify-content:center;flex:none;
}
.ui-av span{display:block;width:${Math.round(w * 0.024)}px;height:${Math.round(w * 0.009)}px;background:${BRAND.apricot}}
.ui-name{font-family:"Golos Text",sans-serif;font-weight:600;font-size:${Math.round(w * 0.0231)}px;color:${BRAND.ink};line-height:1.25}
.ui-handle{font-family:"JetBrains Mono",monospace;font-size:${Math.round(w * 0.0194)}px;color:${BRAND.inkFaint};letter-spacing:.04em}
.ui-mid{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:${Math.round(w * 0.037)}px;text-align:center;
}
.ui-head{
  font-family:"Unbounded",sans-serif;font-weight:700;
  font-size:${Math.round(w * 0.0713)}px;line-height:1.08;letter-spacing:-.025em;
  color:${BRAND.ink};text-wrap:balance;
}
.ui-head em{font-style:normal;color:${BRAND.afterglow}}
.ui-glyph{
  font-family:"Unbounded",sans-serif;font-weight:700;
  font-size:${Math.round(w * 0.13)}px;line-height:1;color:${BRAND.line};
  letter-spacing:-.04em;font-variant-numeric:tabular-nums;
}
.ui-sub{font-family:"Golos Text",sans-serif;font-size:${Math.round(w * 0.0296)}px;color:${BRAND.inkSoft};line-height:1.4;max-width:${Math.round(w * 0.78)}px}
.ui-bot{
  display:flex;gap:${Math.round(w * 0.055)}px;align-items:center;justify-content:center;
  padding-top:${Math.round(w * 0.028)}px;border-top:2px solid ${BRAND.line};
}
.ui-act{display:flex;align-items:center;gap:${Math.round(w * 0.011)}px}
.ui-act svg{display:block;width:${Math.round(w * 0.032)}px;height:${Math.round(w * 0.032)}px;flex:none}
.ui-act.heart{color:${BRAND.afterglow}}
.ui-act.save{color:${BRAND.night}}
.ui-act.send{color:${BRAND.night}}
.ui-act b{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:${Math.round(w * 0.0185)}px;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.inkSoft}}

.shot-full{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top}
.shot-veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(26,34,56,.34),rgba(26,34,56,.62))}
.plate-note{
  position:relative;z-index:2;margin-top:${Math.round(w * 0.037)}px;
  font-family:"Golos Text",sans-serif;font-size:${Math.round(w * 0.0296)}px;line-height:1.4;
  color:rgba(255,255,255,.82);max-width:${Math.round(w * 0.78)}px;
}
.plate{
  position:relative;z-index:2;margin-top:${Math.round(w * 0.046)}px;
  background:#FFFFFF;border:3px solid ${BRAND.apricot};border-radius:${Math.round(w * 0.022)}px;
  padding:${Math.round(w * 0.046)}px ${Math.round(w * 0.042)}px;
  box-shadow:0 ${Math.round(w * 0.018)}px ${Math.round(w * 0.046)}px rgba(10,14,28,.28);
  display:flex;flex-direction:column;gap:${Math.round(w * 0.018)}px;
}
.plate .hook{
  font-family:"Unbounded",sans-serif;font-weight:700;
  font-size:${Math.round(w * 0.048)}px;line-height:1.1;letter-spacing:-.02em;
  text-transform:uppercase;color:${BRAND.night};text-wrap:balance;
}
.plate .ask{font-family:"Golos Text",sans-serif;font-size:${Math.round(w * 0.0278)}px;line-height:1.35;color:${BRAND.inkSoft}}
.plate-foot{
  position:relative;z-index:2;margin-top:auto;display:flex;justify-content:space-between;align-items:center;
  font-family:"JetBrains Mono",monospace;font-size:${Math.round(w * 0.0204)}px;
  letter-spacing:.1em;text-transform:uppercase;color:#FFFFFF;
}
.plate-foot b{color:${BRAND.apricot};font-weight:700}

.sw-row{display:flex;gap:${Math.round(w * 0.018)}px;width:100%}
.sw{flex:1;height:${Math.round(w * 0.16)}px;border-radius:2px;display:flex;align-items:flex-end;padding:${Math.round(w * 0.014)}px}
.sw span{font-family:"JetBrains Mono",monospace;font-size:${Math.round(w * 0.0176)}px;letter-spacing:.04em;color:#fff;mix-blend-mode:difference}
`;

export const studioTheme: PostTheme = {
  key: "studio",
  name: "Studio",
  description: "Кейсы, цены, разборы — то, что продаёт. Unbounded, ночной/светлый фон.",
  fonts: FONTS,
  palette: BRAND,
  supports: [
    "cover", "stat", "points", "prices", "compare", "case", "cta",
    "word", "ui", "plate", "palette", "hl",
  ],
  css,
};
