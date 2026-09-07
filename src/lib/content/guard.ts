import type { GuardIssue, PostSpec } from "./types";

/**
 * QA-гейт перед аппрувом (ПРОМПТ-3 §1.6, перенос кодируемых пунктов из
 * docs/smm/QA.md). `error` блокирует переход review → approved; `warning` — нет.
 *
 * Инвариант, который держат тесты: все `ready`-посты сентябрьского плана
 * проходят гейт с нулём ошибок. Поэтому правила сформулированы точно, а не
 * «на всякий случай»:
 *  — наша цена заявляется на сайте конструкцией «от $N»; ошибка — только на
 *    «от $N» с N вне опубликованного прайса brain.md. Рыночные и примерные
 *    (~$N, «около $N», «за $N») цифры легитимны и не блокируются.
 *  — призыв прокомментировать проверяется как «в комментари…», НЕ по
 *    ключевому слову: ключ ставится лишь на каждый 3–4-й пост.
 */

// Опубликованный прайс — docs/smm/brain.md §«Публичная цена на сайте».
const OUR_PRICES = new Set([840, 1000, 1130, 1680, 2080, 2590]);
// Именно «от $N» — так студия называет свою цену.
const OUR_PRICE_RE = /от\s*\$\s*([\d][\d\s.,]*)/gi;
const LIGHTHOUSE_RE = /lighthouse/i;
const LIGHTHOUSE_OK_RE = /не\s+(пользуемся|используем)|без\s+lighthouse/i;

/** Собирает все строковые узлы поста как `[путь, текст]`. */
function textNodes(spec: PostSpec): [string, string][] {
  const out: [string, string][] = [];
  const push = (path: string, v: unknown) => {
    if (typeof v === "string" && v.trim()) out.push([path, v]);
  };
  const walk = (path: string, v: unknown) => {
    if (typeof v === "string") push(path, v);
    else if (Array.isArray(v)) v.forEach((item, j) => walk(`${path}[${j}]`, item));
    else if (v && typeof v === "object")
      for (const [k, vv] of Object.entries(v)) walk(`${path}.${k}`, vv);
  };
  spec.slides.forEach((s, i) => {
    for (const [k, v] of Object.entries(s)) walk(`slides[${i}].${k}`, v);
  });
  return out;
}

/** Эффективная подпись для площадки (с фолбэком на default). */
function captionFor(spec: PostSpec, p: string): string {
  const c = spec.caption ?? {};
  const byPlatform: Record<string, string | undefined> = {
    instagram: c.instagram,
    telegram: c.telegram,
    threads: c.threads,
    linkedin: c.linkedin,
  };
  return (byPlatform[p] ?? c.default ?? c.instagram ?? "").trim();
}

export function runGuard(spec: PostSpec): GuardIssue[] {
  const issues: GuardIssue[] = [];
  const add = (level: GuardIssue["level"], code: string, message: string, path: string) =>
    issues.push({ level, code, message, path });

  const c = spec.caption ?? {};
  const primary = (c.instagram ?? c.default ?? "").trim();
  const tgCaption = (c.telegram ?? c.default ?? "").trim();

  // Весь текст поста: слайды + все подписи — для ценовой и lighthouse-проверок.
  const slideText = textNodes(spec)
    .map((n) => n[1])
    .join("\n");
  const allText = `${slideText}\n${Object.values(c).join("\n")}`;

  // ── ОШИБКИ (блокируют аппрув) ──

  // Пустая подпись для площадки из platforms.
  for (const p of spec.platforms) {
    if (!captionFor(spec, p)) {
      add("error", "caption-empty", `Пустая подпись для площадки «${p}»`, "caption");
    }
  }

  // Вопрос читателю (+36,7% комментариев).
  if (!primary.includes("?")) {
    add("error", "no-question", "В подписи нет вопроса читателю", "caption");
  }

  // Призыв прокомментировать (+202,8% комментариев).
  if (!/в\s+комментари/i.test(primary)) {
    add("error", "no-comment-cta", "В подписи нет призыва прокомментировать", "caption");
  }

  // Хэштеги запрещены (−31,7% просмотров) — ни в поле, ни в тексте подписей.
  const tags = spec.hashtags ?? [];
  if (tags.length) {
    add("error", "hashtags", `Хэштеги запрещены (в поле hashtags: ${tags.length})`, "hashtags");
  }
  const inlineTags = (Object.values(c).join(" ").match(/#[\wа-яё]+/gi) ?? []).length;
  if (inlineTags) {
    add("error", "hashtags-inline", `Хэштеги в подписи запрещены (${inlineTags})`, "caption");
  }

  // Число слайдов вне 1..10.
  const n = spec.slides.length;
  if (n < 1 || n > 10) {
    add("error", "slides-count", `Слайдов ${n} — вне диапазона 1–10`, "slides");
  }

  // Наша цена «от $N» вне прайса brain.md.
  OUR_PRICE_RE.lastIndex = 0;
  const flagged = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = OUR_PRICE_RE.exec(allText))) {
    const num = parseInt(m[1].replace(/[\s.,]/g, ""), 10);
    if (!Number.isNaN(num) && !OUR_PRICES.has(num) && !flagged.has(num)) {
      flagged.add(num);
      add("error", "our-price", `Наша цена «от $${num}» не из прайса brain.md`, "slides");
    }
  }

  // Lighthouse утвердительно — мы им не пользуемся.
  if (LIGHTHOUSE_RE.test(allText) && !LIGHTHOUSE_OK_RE.test(allText)) {
    add("error", "lighthouse", "Упоминание Lighthouse: мы им не пользуемся", "slides");
  }

  // ── ПРЕДУПРЕЖДЕНИЯ (не блокируют) ──

  if (tgCaption.length > 1024) {
    add(
      "warning",
      "tg-length",
      `Telegram-подпись ${tgCaption.length} > 1024 — уйдёт отдельным сообщением`,
      "caption.telegram",
    );
  }

  const last = spec.slides[spec.slides.length - 1];
  if (last && last.type !== "cta") {
    add("warning", "last-not-cta", `Последний слайд «${last.type}», не спроектирован под CTA`, "slides");
  }

  if (spec.platforms.includes("instagram") && !(c.alt ?? "").trim()) {
    add("warning", "no-alt", "Нет альтернативного текста (alt) для Instagram", "caption.alt");
  }

  return issues;
}

export const guardBlocks = (issues: GuardIssue[]): boolean =>
  issues.some((i) => i.level === "error");
