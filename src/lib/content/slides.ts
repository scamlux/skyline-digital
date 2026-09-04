import { readFileSync, existsSync } from "node:fs";
import { extname } from "node:path";
import { CANVAS, type PostFormat, type PostMeta, type Slide } from "./types";
import { getTheme } from "./themes";

const esc = (s: unknown = ""): string =>
  String(s).replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );

/** Картинки вшиваются в HTML: рендер не зависит от путей и сети. */
function dataUri(path?: string): string | null {
  if (!path) return null;
  if (path.startsWith("data:") || path.startsWith("http")) return path;
  if (!existsSync(path)) return null;
  const mime =
    { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[
      extname(path).toLowerCase()
    ] ?? "image/jpeg";
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}

const mark = '<span class="mark"><i></i><i></i><i></i></span>';

const foot = (s: { foot?: string; swipe?: string }, meta: PostMeta): string => {
  const left = s.foot ?? meta.handle;
  const right = s.swipe ? `<span class="swipe">${esc(s.swipe)}</span>` : `<b>${esc(meta.site)}</b>`;
  return `<div class="foot"><span>${esc(left)}</span>${right}</div>`;
};

const RENDERERS = {
  cover: (s: Extract<Slide, { type: "cover" }>, meta: PostMeta) => `
  <div class="stack">
    ${mark}
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
  </div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:flex-end;gap:28px;padding-bottom:6%">
    <h1>${esc(s.title)}</h1>
    ${s.subtitle ? `<div class="body">${esc(s.subtitle)}</div>` : ""}
  </div>
  ${foot(s, meta)}`,

  stat: (s: Extract<Slide, { type: "stat" }>, meta: PostMeta) => `
  <div class="stack">${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}</div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:32px">
    <div class="figure">${esc(s.value)}${s.unit ? `<span class="unit"> ${esc(s.unit)}</span>` : ""}</div>
    ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
    ${s.note ? `<div class="body">${esc(s.note)}</div>` : ""}
  </div>
  ${foot(s, meta)}`,

  points: (s: Extract<Slide, { type: "points" }>, meta: PostMeta) => `
  <div class="stack">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
  </div>
  <div class="grow" style="display:flex;align-items:center">
    <div class="rows">
      ${s.items
        .map(
          (it, i) => `<div class="row">
            <div class="n">${esc(it.n ?? String(i + 1).padStart(2, "0"))}</div>
            <div><div class="t">${esc(it.title)}</div>${it.text ? `<div class="d">${esc(it.text)}</div>` : ""}</div>
          </div>`,
        )
        .join("")}
    </div>
  </div>
  ${foot(s, meta)}`,

  prices: (s: Extract<Slide, { type: "prices" }>, meta: PostMeta) => `
  <div class="stack">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
  </div>
  <div class="grow" style="display:flex;align-items:center">
    <div class="rows">
      ${s.items
        .map(
          (it) =>
            `<div class="price-row"><span class="what">${esc(it.what)}</span><span class="val">${esc(it.val)}</span></div>`,
        )
        .join("")}
    </div>
  </div>
  ${s.note ? `<div class="body" style="margin-bottom:24px">${esc(s.note)}</div>` : ""}
  ${foot(s, meta)}`,

  compare: (s: Extract<Slide, { type: "compare" }>, meta: PostMeta) => `
  <div class="stack">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
  </div>
  <div class="grow" style="display:flex;align-items:center">
    <div class="compare">
      ${[s.left, s.right]
        .map(
          (p, i) => `<div class="pane${i === 1 ? " hi" : ""}">
            <div class="cap">${esc(p.cap)}</div>
            <div class="big">${esc(p.big)}</div>
            <div class="sub">${esc(p.sub)}</div>
          </div>`,
        )
        .join("")}
    </div>
  </div>
  ${s.note ? `<div class="body" style="margin-bottom:24px">${esc(s.note)}</div>` : ""}
  ${foot(s, meta)}`,

  case: (s: Extract<Slide, { type: "case" }>, meta: PostMeta) => {
    const img = dataUri(s.image);
    return `
  <div class="stack">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
  </div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:34px">
    ${img ? `<img class="shot" src="${img}" alt="">` : ""}
    ${s.text ? `<div class="body">${esc(s.text)}</div>` : ""}
    ${s.tags?.length ? `<div class="tags">${s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
  </div>
  ${foot(s, meta)}`;
  },

  cta: (s: Extract<Slide, { type: "cta" }>, meta: PostMeta) => `
  <div class="stack">${mark}${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}</div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:30px">
    <h1>${esc(s.title)}</h1>
    ${s.text ? `<div class="body">${esc(s.text)}</div>` : ""}
    ${s.action ? `<div class="eyebrow" style="font-size:30px;letter-spacing:.06em">→ ${esc(s.action)}</div>` : ""}
  </div>
  ${foot(s, meta)}`,

  terminal: (s: Extract<Slide, { type: "terminal" }>, meta: PostMeta) => `
  <div class="stack">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
  </div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:30px">
    <div class="term">
      <div class="bar"><i></i><i></i><i></i><span>${esc(s.window ?? "skyline — zsh")}</span></div>
      <div class="body-lines">
        ${s.lines
          .map((l) =>
            typeof l === "string"
              ? `<div class="ln out">${esc(l)}</div>`
              : `<div class="ln ${esc(l.kind ?? "out")}">${esc(l.text)}</div>`,
          )
          .join("")}
      </div>
    </div>
    ${s.text ? `<div class="body">${esc(s.text)}</div>` : ""}
  </div>
  ${foot(s, meta)}`,

  take: (s: Extract<Slide, { type: "take" }>, meta: PostMeta) => {
    const hl = esc(s.text).replace(/\*(.+?)\*/g, "<em>$1</em>");
    return `
  <div class="stack">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
  </div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:22px">
    <div class="take-mark">“</div>
    <div class="take">${hl}</div>
    ${s.note ? `<div class="body">${esc(s.note)}</div>` : ""}
  </div>
  ${foot(s, meta)}`;
  },

  word: (s: Extract<Slide, { type: "word" }>, meta: PostMeta) => {
    // Штрихи детерминированы: иначе тот же слайд рендерится по-разному и диффы шумят.
    const streaks = [7, 23, 41, 58, 71, 86, 94]
      .map((t, i) => `<i style="left:${(t * 1.6 - 40).toFixed(1)}%;top:${i * 15 + 4}%"></i>`)
      .join("");
    return `
  <div class="streaks">${streaks}</div>
  <div class="stack" style="position:relative;z-index:1">
    ${mark}
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
  </div>
  <div class="word-wrap">
    ${s.line1 ? `<div class="word-1">${esc(s.line1)}</div>` : ""}
    <div class="word-2">${esc(s.line2)}</div>
    ${s.line3 ? `<div class="word-3">${esc(s.line3)}</div>` : ""}
  </div>
  <div style="position:relative;z-index:1">${foot(s, meta)}</div>`;
  },

  ui: (s: Extract<Slide, { type: "ui" }>, meta: PostMeta) => {
    const head = esc(s.title).replace(/\*(.+?)\*/g, "<em>$1</em>");
    const ICON: Record<string, string> = {
      heart:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M12 20.5 3.8 12.6a4.9 4.9 0 0 1 0-7 4.9 4.9 0 0 1 7 0l1.2 1.2 1.2-1.2a4.9 4.9 0 0 1 7 0 4.9 4.9 0 0 1 0 7Z"/></svg>',
      save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M5.5 3.5h13v17l-6.5-5-6.5 5Z"/></svg>',
      send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M21.5 2.5 10.5 13.5M21.5 2.5l-7 19-4-8-8-4Z"/></svg>',
    };
    const acts: [string, string][] = [
      ["heart", s.actions?.[0] ?? "нравится"],
      ["save", s.actions?.[1] ?? "сохранить"],
      ["send", s.actions?.[2] ?? "отправить"],
    ];
    return `
  <div class="ui-top">
    <div class="ui-av"><span></span></div>
    <div>
      <div class="ui-name">${esc(s.name ?? "Skyline Digital")}</div>
      <div class="ui-handle">${esc(meta.handle)}</div>
    </div>
  </div>
  <div class="ui-mid">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    <div class="ui-head">${head}</div>
    ${s.glyph ? `<div class="ui-glyph">${esc(s.glyph)}</div>` : ""}
    ${s.subtitle ? `<div class="ui-sub">${esc(s.subtitle)}</div>` : ""}
  </div>
  <div class="ui-bot">
    ${acts.map(([k, label]) => `<div class="ui-act ${k}">${ICON[k]}<b>${esc(label)}</b></div>`).join("")}
  </div>`;
  },

  plate: (s: Extract<Slide, { type: "plate" }>, meta: PostMeta) => {
    const img = dataUri(s.image);
    const streaks = img
      ? ""
      : `<div class="streaks" style="opacity:.16">${[7, 23, 41, 58, 71, 86, 94]
          .map((t, i) => `<i style="left:${(t * 1.6 - 40).toFixed(1)}%;top:${i * 15 + 4}%"></i>`)
          .join("")}</div>`;
    return `
  ${img ? `<img class="shot-full" src="${img}" alt="">` : ""}
  ${streaks}
  <div class="shot-veil"></div>
  <div class="plate">
    <div class="hook">${esc(s.hook)}</div>
    ${s.ask ? `<div class="ask">${esc(s.ask)}</div>` : ""}
  </div>
  ${s.note ? `<div class="plate-note">${esc(s.note)}</div>` : ""}
  <div class="plate-foot">
    <span>${esc(s.foot ?? meta.handle)}</span>
    ${s.swipe ? `<b>${esc(s.swipe)}</b>` : `<b>${esc(meta.site)}</b>`}
  </div>`;
  },

  palette: (s: Extract<Slide, { type: "palette" }>, meta: PostMeta) => `
  <div class="stack">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
  </div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:34px">
    <div class="sw-row">
      ${(s.colors ?? [])
        .map((c) => `<div class="sw" style="background:${esc(c)}"><span>${esc(c)}</span></div>`)
        .join("")}
    </div>
    ${s.text ? `<div class="body">${esc(s.text)}</div>` : ""}
    ${s.tags?.length ? `<div class="tags">${s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
  </div>
  ${foot(s, meta)}`,

  hl: (s: Extract<Slide, { type: "hl" }>) => `
  <div class="hl-wrap">
    <div class="hl-word${s.word.length > 7 ? " long" : ""}">${esc(s.word)}</div>
    ${s.note ? `<div class="hl-note">${esc(s.note)}</div>` : ""}
  </div>`,
};

/** Один слайд → самодостаточный HTML-документ. */
export function slideHtml(
  slide: Slide,
  meta: PostMeta,
  format: PostFormat = "post",
  styleKey = "studio",
): string {
  const { w, h } = CANVAS[format] ?? CANVAS.post;
  const theme = getTheme(styleKey);
  if (!theme.supports.includes(slide.type)) {
    throw new Error(`Тема «${theme.key}» не поддерживает слайд «${slide.type}»`);
  }
  const render = RENDERERS[slide.type] as (s: Slide, m: PostMeta) => string;
  const tone = slide.tone ?? "light";
  const framed = slide.frame ? " framed" : "";
  // Сторис: верх и низ кадра перекрыты интерфейсом Instagram.
  const safe = format === "story" ? " story" : "";
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<style>${theme.css(w, h)}</style></head>
<body><div class="slide ${tone}${framed}${safe}">${render(slide, meta)}</div></body></html>`;
}
