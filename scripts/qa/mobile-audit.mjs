// Мобильный аудит шаблонов сайтов для бизнеса (/sites/*) — волна 2.
// Охват: 4 шаблона × стили a/b × языки ru/en/uz + кабинет каждого шаблона + витрина /sites,
// на ширинах 360 / 390 / 430 (DPR 2, touch). Печатает таблицу pass/fail; код выхода 1, если есть провалы.
//
// Проверки на каждой странице:
//   overflow   — нет горизонтального скролла документа;
//   wide       — ни один видимый элемент не шире экрана (кроме внутри прокручиваемых/обрезающих блоков);
//   tap        — зоны нажатия ≥ 44 px (языковые «пилюли» ≥ 40 px; строчные ссылки внутри текста не в счёт);
//   text       — текст абзацев (≥ 25 знаков в одном узле) ≥ 15 px;
//   first      — первый экран (100svh) показывает бренд + картинку + главную кнопку (только сайты);
//   sticky     — прилипающие панели не закрывают текст: низ страницы выше нижней панели,
//                якоря не прячутся под верхней панелью;
//   demobar    — плашка «демо» на месте: подписи не обрезаны (только сайты);
//   console    — 0 ошибок консоли и исключений;
//   net        — 0 ответов 4xx/5xx и упавших запросов (кроме /_vercel/insights).
//
// Запуск:  BASE=http://localhost:3100 node scripts/qa/mobile-audit.mjs
//   TPL=cafe,clinic    — только эти шаблоны;   WIDTHS=360,390    — только эти ширины;
//   SHOTS=<папка>      — куда класть скриншоты первого экрана (по умолчанию ./screenshots);
//   VERBOSE=1          — печатать и успешные строки.
// Chrome — локальный (puppeteer-core), Playwright и Chromium не ставим.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3100";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SHOTS = process.env.SHOTS || path.resolve("screenshots");
const VERBOSE = !!process.env.VERBOSE;

const ALL_WIDTHS = [360, 390, 430];
const WIDTHS = (process.env.WIDTHS ? process.env.WIDTHS.split(",").map(Number) : ALL_WIDTHS).filter(Boolean);
const HEIGHT_OF = { 360: 740, 390: 844, 430: 932 };
const LOCALES = ["ru", "en", "uz"];
const STYLES = ["a", "b"];
/** Бренд на первом экране ищем по этим именам (регистр не важен). */
const TEMPLATES = [
  { id: "restaurant", brand: { a: "Dasturxon", b: "Dasturxon" } },
  { id: "clinic", brand: { a: "Oq Tabassum", b: "Oq Tabassum" } },
  { id: "salon", brand: { a: "USTARA", b: "Nafis" } },
  { id: "cafe", brand: { a: "Bodom", b: "Bodom" } },
];
const only = process.env.TPL ? process.env.TPL.split(",") : null;
const TPLS = TEMPLATES.filter((t) => !only || only.includes(t.id));

const MIN_TAP = 44;
const MIN_TAP_LANG = 40;
const MIN_TEXT = 15;
const CHECKS = ["overflow", "wide", "tap", "text", "first", "sticky", "demobar", "console", "net"];

const prefix = (locale) => (locale === "ru" ? "" : `/${locale}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Список страниц: сайты (с проверкой первого экрана), кабинеты и витрина. */
function buildPages() {
  const pages = [];
  for (const t of TPLS) {
    for (const style of STYLES)
      for (const locale of LOCALES) {
        pages.push({ kind: "site", tpl: t.id, style, locale, brand: t.brand[style], url: `${prefix(locale)}/sites/${t.id}/${style}` });
      }
    for (const locale of LOCALES) pages.push({ kind: "admin", tpl: t.id, style: "-", locale, url: `${prefix(locale)}/sites/${t.id}/admin` });
  }
  if (!only) for (const locale of LOCALES) pages.push({ kind: "showroom", tpl: "showroom", style: "-", locale, url: `${prefix(locale)}/sites` });
  return pages;
}

/**
 * Всё, что можно измерить внутри страницы, одним вызовом (быстро и без гонок).
 * Возвращает по проверке список нарушителей; пустой список = пройдено.
 */
function measure({ kind, brand, minTap, minTapLang, minText }) {
  const vw = innerWidth;
  const vh = innerHeight;
  const OVERFLOW_CLIP = new Set(["hidden", "clip", "auto", "scroll"]);
  const cut = (s, n = 40) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const clsOf = (el) => (typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
  /** Имя элемента для отчёта: тег.класс; у безымянных добавляем класс ближайшего предка. */
  const label = (el) => {
    let name = `${el.tagName.toLowerCase()}${clsOf(el) ? "." + clsOf(el) : ""}`;
    if (!clsOf(el)) {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (clsOf(p)) {
          name = `${clsOf(p)} > ${name}`;
          break;
        }
      }
    }
    return `${name}“${cut(el.textContent || el.getAttribute("aria-label") || el.getAttribute("alt"), 28)}”`;
  };
  const shown = (el) => {
    try {
      return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    } catch {
      return getComputedStyle(el).visibility !== "hidden";
    }
  };
  const rectOf = (el) => el.getBoundingClientRect();
  /** Элемент обрезан/прокручивается внутри предка, который сам помещается в экран. */
  const containedByScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (OVERFLOW_CLIP.has(cs.overflowX) && rectOf(p).right <= vw + 1.5 && rectOf(p).left >= -1.5) return true;
    }
    return false;
  };
  const inDemoBar = (el) => !!el.closest(".bg-night");
  /**
   * «Растянутая» ссылка/кнопка (::after на всю карточку): нажимается вся карточка, а не только подпись.
   * Проверяем по факту: точки внутри ближайшего достаточного предка попадают в этот элемент.
   */
  const stretchedHit = (el, need) => {
    let box = el.parentElement;
    const savedY = scrollY;
    for (let i = 0; i < 4 && box && box !== document.body; i++, box = box.parentElement) {
      if (rectOf(box).width < need || rectOf(box).height < need || rectOf(box).width > vw + 1) continue;
      box.scrollIntoView({ block: "center", behavior: "instant" });
      const r = rectOf(box);
      const pts = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];
      const hits = pts.map(([fx, fy]) => {
        const x = r.left + r.width * fx;
        const y = r.top + r.height * fy;
        if (x < 0 || x > vw || y < 0 || y > vh) return null;
        const hit = document.elementFromPoint(x, y);
        return hit ? el.contains(hit) : false;
      });
      const known = hits.filter((h) => h !== null);
      if (known.length >= 2 && known.every(Boolean)) {
        scrollTo(0, savedY);
        return true;
      }
    }
    scrollTo(0, savedY);
    return false;
  };
  const out = Object.fromEntries(["overflow", "wide", "tap", "text", "first", "sticky", "demobar"].map((k) => [k, []]));

  // 1. Документ не шире экрана.
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) out.overflow.push(`scrollWidth ${sw} > ${vw}`);

  // 5. Первый экран — снимаем до прокрутки страницы (сработает, пока ничего не «доехало» по reveal).
  if (kind === "site") {
    const inFirst = (r) => r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
    const nameRe = new RegExp(brand, "i");
    const brandHit = [...document.querySelectorAll("header *, nav *, a, h1, strong, b, span, img")].some((el) => {
      if (inDemoBar(el) || !shown(el)) return false;
      const r = rectOf(el);
      if (!inFirst(r) || r.width < 8) return false;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
      return nameRe.test(own) || (el.tagName === "IMG" && nameRe.test(el.alt || ""));
    });
    if (!brandHit) out.first.push(`бренд «${brand}» не виден на первом экране`);
    const visualHit = [...document.querySelectorAll("img, video, canvas, picture, svg, [style*='background-image']")].some((el) => {
      if (inDemoBar(el) || !shown(el)) return false;
      const r = rectOf(el);
      const w = Math.min(r.right, vw) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (w < 140 || h < 120) return false;
      if (el.tagName === "IMG") return el.complete && el.naturalWidth > 0;
      return true;
    });
    if (!visualHit) out.first.push("нет крупной картинки на первом экране");
    const ctaHit = [...document.querySelectorAll("a[href], button")].some((el) => {
      if (inDemoBar(el) || el.hasAttribute("hreflang") || !shown(el)) return false;
      const r = rectOf(el);
      if (r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw || r.height < 40 || r.width < 90) return false;
      if (cut(el.textContent).length < 2) return false;
      const bg = getComputedStyle(el).backgroundColor.match(/[\d.]+/g) || [];
      const alpha = bg.length === 4 ? Number(bg[3]) : bg.length === 3 ? 1 : 0;
      return alpha > 0.5;
    });
    if (!ctaHit) out.first.push("нет главной кнопки (залитой) на первом экране");
  }

  // 7. Плашка «демо» (только сайт): подписи в плашке не обрезаны, плашка в экране.
  if (kind === "site") {
    const bar = document.querySelector(".bg-night");
    if (!bar) out.demobar.push("плашка не найдена");
    else {
      if (bar.scrollWidth > vw + 1) out.demobar.push(`плашка шире экрана: ${bar.scrollWidth} > ${vw}`);
      for (const el of bar.querySelectorAll("a, span, p")) {
        if (!shown(el) || el.classList.contains("sr-only")) continue;
        const r = rectOf(el);
        if (r.right > vw + 1 || r.left < -1) out.demobar.push(`${label(el)} вылез за экран`);
        else if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== "inline") out.demobar.push(`${label(el)} обрезан`);
      }
      const pills = [...bar.querySelectorAll("nav a")].filter((a) => shown(a));
      const rects = pills.map((a) => rectOf(a));
      for (let i = 1; i < rects.length; i++) if (rects[i].left < rects[i - 1].right - 1 && Math.abs(rects[i].top - rects[i - 1].top) < 4) out.demobar.push("кнопки плашки наезжают друг на друга");
    }
  }

  // Дальше — по всей странице: прокрутка уже сделана снаружи, reveal отработал.
  // 2. Элементы шире экрана.
  for (const el of document.body.querySelectorAll("*")) {
    if (!shown(el)) continue;
    const r = rectOf(el);
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" && cs.pointerEvents === "none") continue;
    if (r.width > vw + 1 || r.right > vw + 1.5 || r.left < -1.5) {
      if (el.closest("[aria-hidden='true'], [inert]") && cs.position !== "fixed") {
        // Декор (aria-hidden): не нарушает чтения, но если он расширяет документ, поймает overflow.
        continue;
      }
      if (containedByScroller(el)) continue;
      // Предок с transform/scroll-snap внутри ленты — тоже прокрутка; прямые потомки ленты сюда не попадут.
      out.wide.push(`${label(el)} ${Math.round(r.left)}…${Math.round(r.right)} (ширина ${Math.round(r.width)})`);
    }
  }

  // 3. Зоны нажатия.
  const tapSel = "a[href], button, input:not([type=hidden]):not([type=range]), select, textarea, summary, [role=button], [role=tab], [role=switch]";
  const seenTap = new Set();
  for (const el of document.querySelectorAll(tapSel)) {
    if (el.disabled || !shown(el)) continue;
    if (el.closest(".sr-only") || el.classList.contains("sr-only")) continue;
    // Чекбокс/радио: нажимается вся подпись.
    const target = ["checkbox", "radio"].includes(el.type) ? el.closest("label") || el : el;
    if (seenTap.has(target)) continue;
    seenTap.add(target);
    const r = rectOf(target);
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(target);
    // Строчная ссылка внутри абзаца: исключение WCAG 2.5.8 (inline).
    if (target.tagName === "A" && cs.display === "inline") {
      const parentText = cut(target.parentElement?.textContent, 400);
      if (parentText.length > cut(target.textContent, 400).length + 12) continue;
    }
    const need = target.hasAttribute("hreflang") ? minTapLang : minTap;
    if ((r.width < need - 0.5 || r.height < need - 0.5) && !stretchedHit(target, need)) out.tap.push(`${label(target)} ${Math.round(r.width)}×${Math.round(r.height)} < ${need}`);
  }

  // 4. Размер текста абзацев.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seenText = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = cut(n.textContent, 400);
    if (text.length < 25) continue;
    const el = n.parentElement;
    if (!el || seenText.has(el)) continue;
    if (el.closest("script, style, noscript, svg, [aria-hidden='true'], .sr-only") || !shown(el)) continue;
    seenText.add(el);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < minText - 0.01) out.text.push(`${label(el)} ${fs}px: «${cut(text, 34)}»`);
  }

  // 6. Прилипающие панели.
  const bars = [...document.body.querySelectorAll("*")].filter((el) => {
    const pos = getComputedStyle(el).position;
    if ((pos !== "fixed" && pos !== "sticky") || !shown(el)) return false;
    const r = rectOf(el);
    return r.height > 8 && r.height < vh * 0.5 && r.width >= vw * 0.5;
  });
  const bottomBars = bars.filter((b) => rectOf(b).bottom >= vh - 1.5);
  const topBars = bars.filter((b) => rectOf(b).top <= 1.5 && rectOf(b).bottom < vh * 0.4);
  // Текст в самом низу страницы (мы уже внизу): не должен прятаться под нижней панелью.
  if (bottomBars.length) {
    const barTop = Math.min(...bottomBars.map((b) => rectOf(b).top));
    let lowest = null;
    const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w2.nextNode(); n; n = w2.nextNode()) {
      if (cut(n.textContent).length < 2) continue;
      const el = n.parentElement;
      if (!el || bars.some((b) => b.contains(el)) || el.closest("script, style, noscript, svg, [aria-hidden='true'], .sr-only") || !shown(el)) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const rr = r.getBoundingClientRect();
      if (rr.bottom > vh + 1 || rr.height === 0) continue;
      if (!lowest || rr.bottom > lowest.bottom) lowest = { bottom: rr.bottom, el };
    }
    if (lowest && lowest.bottom > barTop + 1) out.sticky.push(`низ страницы «${cut(lowest.el.textContent, 24)}» (${Math.round(lowest.bottom)}) под нижней панелью (${Math.round(barTop)})`);
  }
  return { out, topBarBottom: topBars.length ? Math.max(...topBars.map((b) => rectOf(b).bottom)) : 0, vh };
}

/** Якоря не прячутся под верхней прилипающей панелью (проверка после прокрутки к цели). */
function checkAnchors(topBarBottom) {
  const bad = [];
  if (!topBarBottom) return bad;
  const links = [...document.querySelectorAll("a[href^='#']")].filter((a) => a.getAttribute("href").length > 1);
  const ids = [...new Set(links.map((a) => a.getAttribute("href").slice(1)))].slice(0, 10);
  for (const id of ids) {
    const target = document.getElementById(id);
    if (!target || id === "top" || target.getBoundingClientRect().top + scrollY < 2) continue;
    target.scrollIntoView({ behavior: "instant", block: "start" });
    const heading = target.querySelector("h1, h2, h3") || target;
    const top = Math.min(target.getBoundingClientRect().top, heading.getBoundingClientRect().top);
    const headTop = heading.getBoundingClientRect().top;
    if (headTop < topBarBottom - 2 && top < topBarBottom - 2) bad.push(`#${id}: заголовок на ${Math.round(headTop)}px под панелью до ${Math.round(topBarBottom)}px`);
  }
  window.scrollTo(0, document.documentElement.scrollHeight);
  return bad;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
const pages = buildPages();
const rows = [];
fs.mkdirSync(SHOTS, { recursive: true });

for (const width of WIDTHS) {
  const height = HEIGHT_OF[width] || 844;
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const client = await page.createCDPSession();
  let consoleErrors = [];
  let netErrors = [];
  const ignored = (u) => /\/_vercel\/insights/.test(u || "");
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (ignored(m.location()?.url) || /_vercel\/insights/.test(m.text())) return;
    consoleErrors.push(m.text().slice(0, 200));
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !ignored(r.url())) netErrors.push(`${r.status()} ${r.url().replace(BASE, "")}`);
  });
  page.on("requestfailed", (r) => {
    if (ignored(r.url()) || /ERR_ABORTED/.test(r.failure()?.errorText || "")) return;
    netErrors.push(`FAILED ${r.url().replace(BASE, "")} ${r.failure()?.errorText}`);
  });

  for (const p of pages) {
    consoleErrors = [];
    netErrors = [];
    // Куки языка (NEXT_LOCALE) тянут следующую страницу на прошлый язык: каждый заход — с чистого листа.
    await client.send("Network.clearBrowserCookies");
    const res = await page.goto(BASE + p.url, { waitUntil: "networkidle0", timeout: 60000 }).catch((e) => ({ err: e }));
    if (!res || res.err || (res.status && res.status() >= 400)) {
      rows.push({ width, ...p, failures: { net: [`загрузка: ${res?.err?.message || res?.status?.()}`] } });
      continue;
    }
    await sleep(700);
    const params = { kind: p.kind, brand: p.brand || "", minTap: MIN_TAP, minTapLang: MIN_TAP_LANG, minText: MIN_TEXT };

    // Скриншот первого экрана (ru, 390) — до прокрутки.
    if (width === 390 && p.locale === "ru" && p.kind === "site") await page.screenshot({ path: path.join(SHOTS, `wave2-mobile-${p.tpl}-${p.style}-390.png`) });
    if (p.kind === "showroom" && p.locale === "ru" && width === 390) await page.screenshot({ path: path.join(SHOTS, "wave2-showroom-390.png"), fullPage: true });

    // «Первый экран» и плашку мерим на scrollY = 0; остальное — после полной прокрутки.
    const first = await page.evaluate(measure, params);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += Math.round(height * 0.7)) {
      await page.evaluate((yy) => scrollTo(0, yy), y);
      await sleep(70);
    }
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await sleep(450);
    const full = await page.evaluate(measure, params);
    const anchors = await page.evaluate(checkAnchors, full.topBarBottom);
    await page.evaluate(() => scrollTo(0, 0));

    const failures = {
      overflow: [...new Set([...first.out.overflow, ...full.out.overflow])],
      wide: [...new Set([...first.out.wide, ...full.out.wide])],
      tap: full.out.tap,
      text: full.out.text,
      first: first.out.first,
      sticky: [...full.out.sticky, ...anchors],
      demobar: first.out.demobar,
      console: [...consoleErrors],
      net: [...new Set(netErrors)],
    };

    // Витрина: все 4 шаблона с двумя стилями и ссылками на оба.
    if (p.kind === "showroom") {
      const cards = await page.evaluate(() => ({
        h2: [...document.querySelectorAll("main h2, h2")].map((e) => e.textContent.trim()),
        links: [...document.querySelectorAll("a[href*='/sites/']")].map((a) => a.getAttribute("href")),
      }));
      for (const t of ["restaurant", "clinic", "salon", "cafe"])
        for (const s of ["a", "b"]) if (!cards.links.some((l) => l.endsWith(`/sites/${t}/${s}`))) (failures.first ||= []).push(`нет карточки/ссылки ${t}/${s}`);
      if (cards.h2.length < 4) failures.first.push(`карточек ${cards.h2.length} < 4`);
      if (width === 360 || width === 390) {
        // Заголовки карточек не должны быть пустыми.
        if (cards.h2.slice(0, 4).some((x) => x.length < 3)) failures.first.push("пустой заголовок карточки");
      }
    }
    rows.push({ width, ...p, failures });
    if (width === 390 && p.locale === "ru" && p.kind === "site") {
      // Для отладки удобно видеть, что скриншот снят.
    }
  }
  await ctx.close();
}

// Витрина на десктопе (скриншот 1440) — отдельно.
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/sites`, { waitUntil: "networkidle0" });
  await sleep(500);
  await page.screenshot({ path: path.join(SHOTS, "wave2-showroom-1440.png"), fullPage: true });
  await ctx.close();
}
await browser.close();

/* ——— отчёт ——— */
const failing = (r) => CHECKS.filter((c) => (r.failures[c] || []).length);
const pad = (s, n) => String(s).padEnd(n);
let totalFail = 0;
console.log("\nСТРАНИЦА".padEnd(28) + WIDTHS.map((w) => String(w).padEnd(8)).join("") + "  провалы");
const keys = [...new Set(rows.map((r) => `${r.tpl}/${r.style}/${r.locale}${r.kind === "admin" ? "/admin" : ""}`))];
for (const k of keys) {
  const rs = rows.filter((r) => `${r.tpl}/${r.style}/${r.locale}${r.kind === "admin" ? "/admin" : ""}` === k);
  const cells = WIDTHS.map((w) => {
    const r = rs.find((x) => x.width === w);
    if (!r) return pad("—", 8);
    const f = failing(r);
    totalFail += f.length;
    return pad(f.length ? "FAIL" : "ok", 8);
  });
  const names = [...new Set(rs.flatMap(failing))];
  if (VERBOSE || names.length) console.log(pad(k, 28) + cells.join("") + "  " + names.join(","));
}
console.log("\nИТОГ ПО ПРОВЕРКАМ (число страница×ширина с провалом):");
const matrix = Object.fromEntries(CHECKS.map((c) => [c, rows.filter((r) => (r.failures[c] || []).length).length]));
console.log(CHECKS.map((c) => `${c}: ${matrix[c]}`).join("   "));
console.log(`Загрузок: ${rows.length}; с провалами: ${rows.filter((r) => failing(r).length).length}; всего нарушений-проверок: ${totalFail}`);

// Детали (сгруппированно, чтобы не тонуть): проверка → текст нарушения → где.
const groups = new Map();
for (const r of rows)
  for (const c of failing(r))
    for (const msg of r.failures[c]) {
      const key = `${c} | ${msg}`;
      const where = `${r.tpl}/${r.style}/${r.locale}${r.kind === "admin" ? "/admin" : ""}@${r.width}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(where);
    }
if (groups.size) {
  console.log("\nДЕТАЛИ:");
  for (const [key, where] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 120)) {
    console.log(` • ${key}\n     ${where.length} стр.: ${where.slice(0, 4).join(", ")}${where.length > 4 ? ", …" : ""}`);
  }
}
if (rows.some((r) => failing(r).length)) process.exit(1);
console.log("\nВсё чисто.");
