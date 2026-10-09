/** Общие хелперы сборщиков: HTML → текст, даты, деньги. Всё чистое и тестируемое. */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z#0-9]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

/** HTML → плоский текст: <br>/<p> в переносы, теги прочь, сущности раскрыты. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Любая дата (ISO, RFC 822, epoch-секунды, «Aug 18, 2026») → ISO или null. */
export function toIso(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Первые N символов без обрыва слова. */
export function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${sp > max * 0.6 ? cut.slice(0, sp) : cut}…`;
}

/**
 * Бюджет из свободного текста: «$1,500», «1500-3000 USD», «€2k», «5 000 000 сум».
 * Возвращает null, если валюта не распознана — лучше без бюджета, чем с выдуманным.
 */
export function parseBudget(
  text: string,
): { min: number; max: number; currency: string } | null {
  const cur: [RegExp, string][] = [
    [/\$|usd|долл/i, "USD"],
    [/€|eur/i, "EUR"],
    [/£|gbp/i, "GBP"],
    [/₽|руб|rub/i, "RUB"],
    [/сум|so['‘’]?m|uzs/i, "UZS"],
    [/грн|uah|₴/i, "UAH"],
    [/₸|тенге|kzt/i, "KZT"],
  ];
  const n = String.raw`(\d[\d\s,.]*)\s*(k|к|тыс)?`;
  const re = new RegExp(String.raw`(?:\$|€|£)?\s*${n}(?:\s*[-–—]\s*(?:\$|€|£)?\s*${n})?`, "gi");
  for (const m of text.matchAll(re)) {
    const around = text.slice(Math.max(0, (m.index ?? 0) - 6), (m.index ?? 0) + m[0].length + 8);
    const currency = cur.find(([r]) => r.test(around))?.[1];
    if (!currency) continue;
    const val = (raw: string | undefined, k: string | undefined): number | null => {
      if (!raw) return null;
      const x = Number(raw.replace(/[\s,]/g, "").replace(/\.(?=\d{3}\b)/g, ""));
      if (!Number.isFinite(x) || x <= 0) return null;
      return k ? x * 1000 : x;
    };
    // «50-80 тыс»: множитель второго числа относится и к первому.
    const a = val(m[1], m[2] ?? (m[3] ? m[4] : undefined));
    if (a == null) continue;
    const b = val(m[3], m[4]) ?? a;
    return { min: Math.min(a, b), max: Math.max(a, b), currency };
  }
  return null;
}
