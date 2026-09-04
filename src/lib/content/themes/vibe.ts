import type { PostTheme } from "../types";
import { fontFaceCss } from "../fonts";

/** Вторая шкура — «вайбкодерская»: моно-типографика, терминал, левый рельс. */
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

const FONTS = [
  { family: "Golos Text", slug: "golos-text", weights: [400, 500, 600] },
  { family: "JetBrains Mono", slug: "jetbrains-mono", weights: [400, 700] },
];

const css = (w: number, h: number): string => `
${fontFaceCss(FONTS)}
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

export const vibeTheme: PostTheme = {
  key: "vibe",
  name: "Vibe",
  description:
    "Ликбез, «строю в открытую», мнения — то, что вовлекает. JetBrains Mono, терминал, на «ты».",
  fonts: FONTS,
  palette: VIBE,
  supports: ["cover", "stat", "points", "prices", "compare", "case", "cta", "terminal", "take"],
  css,
};
