import { readFileSync, existsSync } from "node:fs";
import { extname } from "node:path";
import { baseCss, CANVAS } from "./theme.mjs";

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );

/** Картинки вшиваются в HTML, чтобы рендер не зависел от путей и сети. */
function dataUri(path) {
  if (!path || !existsSync(path)) return null;
  const mime =
    { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[
      extname(path).toLowerCase()
    ] || "image/jpeg";
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}

const mark = '<span class="mark"><i></i><i></i><i></i></span>';

const foot = (s, meta) => {
  const left = s.foot ?? meta.handle;
  const right = s.swipe ? `<span class="swipe">${esc(s.swipe)}</span>` : `<b>${esc(meta.site)}</b>`;
  return `<div class="foot"><span>${esc(left)}</span>${right}</div>`;
};

/* ---------- типы слайдов ---------- */

const cover = (s, meta) => `
  <div class="stack">
    ${mark}
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
  </div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:flex-end;gap:28px;padding-bottom:6%">
    <h1>${esc(s.title)}</h1>
    ${s.subtitle ? `<div class="body">${esc(s.subtitle)}</div>` : ""}
  </div>
  ${foot(s, meta)}`;

const stat = (s, meta) => `
  <div class="stack">${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}</div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:32px">
    <div class="figure">${esc(s.value)}${s.unit ? `<span class="unit"> ${esc(s.unit)}</span>` : ""}</div>
    ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
    ${s.note ? `<div class="body">${esc(s.note)}</div>` : ""}
  </div>
  ${foot(s, meta)}`;

const points = (s, meta) => `
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
  ${foot(s, meta)}`;

const prices = (s, meta) => `
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
  ${foot(s, meta)}`;

const compare = (s, meta) => `
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
  ${foot(s, meta)}`;

const caseSlide = (s, meta) => {
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
};

const cta = (s, meta) => `
  <div class="stack">${mark}${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}</div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:30px">
    <h1>${esc(s.title)}</h1>
    ${s.text ? `<div class="body">${esc(s.text)}</div>` : ""}
    ${s.action ? `<div class="eyebrow" style="font-size:30px;letter-spacing:.06em">→ ${esc(s.action)}</div>` : ""}
  </div>
  ${foot(s, meta)}`;

/** Окно терминала — носитель «вайбкодерской» подачи. */
const terminal = (s, meta) => `
  <div class="stack">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
    ${s.title ? `<h2>${esc(s.title)}</h2>` : ""}
  </div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:30px">
    <div class="term">
      <div class="bar"><i></i><i></i><i></i><span>${esc(s.window ?? "skyline \u2014 zsh")}</span></div>
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
  ${foot(s, meta)}`;

/** Крупное мнение на весь слайд. Слово в *звёздочках* подсвечивается. */
const take = (s, meta) => {
  const hl = esc(s.text).replace(/\*(.+?)\*/g, "<em>$1</em>");
  return `
  <div class="stack">
    ${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ""}
  </div>
  <div class="grow" style="display:flex;flex-direction:column;justify-content:center;gap:22px">
    <div class="take-mark">\u201C</div>
    <div class="take">${hl}</div>
    ${s.note ? `<div class="body">${esc(s.note)}</div>` : ""}
  </div>
  ${foot(s, meta)}`;
};

const RENDERERS = { cover, stat, points, prices, compare, case: caseSlide, cta, terminal, take };

/** Один слайд → самодостаточный HTML-документ. */
export function slideHtml(slide, meta, format = "post", style = "studio") {
  const { w, h } = CANVAS[format] ?? CANVAS.post;
  const render = RENDERERS[slide.type];
  if (!render) throw new Error(`Неизвестный тип слайда: ${slide.type}`);
  const tone = slide.tone ?? "light";
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<style>${baseCss(w, h, style)}</style></head>
<body><div class="slide ${tone}">${render(slide, meta)}</div></body></html>`;
}
