import type { GuardIssue, PostSpec } from "./types";

/**
 * Guard §3.3 — «цифры не сочиняются». Ошибка блокирует публикацию,
 * предупреждение — нет. Вызывается при сохранении поста и перед публикацией.
 */

const ALLOWED_PRICES = ["от $450", "до $5000"];
const MARKET_MARKER = /рыночн/i;
const DEADLINE_RE = /(за\s+\d+\s+(дн|недел|месяц))|(сделаем\s+за)|(срок\s+\d+)/i;
const PRICE_RE = /(?:от|до)?\s?\$\s?\d[\d\s,.]*/g;

/** Весь текст поста одним массивом [путь, текст]. */
function textNodes(spec: PostSpec): [string, string][] {
  const out: [string, string][] = [];
  const push = (path: string, v: unknown) => {
    if (typeof v === "string" && v.trim()) out.push([path, v]);
  };
  spec.slides.forEach((s, i) => {
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === "string") push(`slides[${i}].${k}`, v);
      else if (Array.isArray(v))
        v.forEach((item, j) => {
          if (typeof item === "string") push(`slides[${i}].${k}[${j}]`, item);
          else if (item && typeof item === "object")
            for (const [kk, vv] of Object.entries(item)) push(`slides[${i}].${k}[${j}].${kk}`, vv);
        });
      else if (v && typeof v === "object")
        for (const [kk, vv] of Object.entries(v)) push(`slides[${i}].${k}.${kk}`, vv);
    }
  });
  for (const [k, v] of Object.entries(spec.caption ?? {})) push(`caption.${k}`, v as string);
  return out;
}

export function runGuard(spec: PostSpec): GuardIssue[] {
  const issues: GuardIssue[] = [];
  const add = (level: GuardIssue["level"], code: string, message: string, path: string) =>
    issues.push({ level, code, message, path });

  for (const [path, text] of textNodes(spec)) {
    // Наша цена: допустимы только «от $450» и «до $5000»; прочие $-суммы —
    // предупреждение, если рядом нет маркера «рыночная».
    for (const m of text.matchAll(PRICE_RE)) {
      const hit = m[0].trim().replace(/\s+/g, " ");
      const allowed = ALLOWED_PRICES.some((a) => hit.startsWith(a) || a.startsWith(hit));
      if (!allowed && !MARKET_MARKER.test(text)) {
        add("warning", "price", `Сумма «${hit}» вне прайса (разрешены: ${ALLOWED_PRICES.join(", ")})`, path);
      }
    }
    // Обещания сроков запрещены вне ссылки на калькулятор.
    if (DEADLINE_RE.test(text) && !/калькулятор/i.test(text)) {
      add("error", "deadline", "Обещание срока («за N дней/недель», «сделаем за») запрещено", path);
    }
    // Lighthouse в утвердительном контексте — мы им не пользуемся.
    if (/lighthouse/i.test(text) && !/не\s+(пользуемся|используем)|без\s+lighthouse/i.test(text)) {
      add("error", "lighthouse", "Упоминание Lighthouse: мы им не пользуемся", path);
    }
  }

  // Длины подписей и хэштеги.
  const c = spec.caption ?? {};
  const tags = spec.hashtags ?? [];
  const iг = `${c.instagram ?? c.default ?? ""}\n${tags.join(" ")}`;
  if (iг.length > 2200) add("error", "caption-instagram", `Instagram: ${iг.length} > 2200 знаков`, "caption.instagram");
  const th = c.threads ?? c.short ?? c.default ?? "";
  if (th.length > 500) add("error", "caption-threads", `Threads: ${th.length} > 500 знаков`, "caption.threads");
  const thTags = (th.match(/#[\wа-яё]+/gi) ?? []).length;
  if (spec.platforms.includes("threads") && thTags !== 1) {
    add("error", "threads-hashtag", `Threads: нужен ровно один хэштег, сейчас ${thTags}`, "caption.threads");
  }
  const li = c.linkedin ?? "";
  if (li.length > 3000) add("error", "caption-linkedin", `LinkedIn: ${li.length} > 3000 знаков`, "caption.linkedin");
  if (tags.length > 30) add("error", "hashtags", `Хэштегов ${tags.length} > 30`, "hashtags");

  return issues;
}

export const guardBlocks = (issues: GuardIssue[]): boolean =>
  issues.some((i) => i.level === "error");
