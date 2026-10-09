/**
 * Рутины поддержки профилей. Площадки, где автоматизация запрещена правилами
 * (Upwork, LinkedIn, Reddit, HN, Clutch), ведутся так: в нужный день конвейер
 * присылает в Telegram готовый текст и ссылку — владелец публикует за минуту.
 * Каждая рутина срабатывает один раз за период (ключ периода хранится в БД).
 *
 * Тексты — только из фактов brain.md и сайта: никаких выдуманных цифр.
 */

export interface Routine {
  id: string;
  cadence: "weekly" | "monthly" | "quarterly";
  /** weekly: день недели 1=пн…7=вс; monthly/quarterly: число месяца. */
  day: number;
  title: string;
  url: string;
  text: string;
}

const SITE = "https://skyline-digital.uz";

export const ROUTINES: Routine[] = [
  {
    id: "hn-hired",
    cadence: "monthly",
    day: 1,
    title: "HN «Who wants to be hired?» — новый тред месяца",
    url: "https://news.ycombinator.com/submitted?id=whoishiring",
    text: `Location: Tashkent, Uzbekistan (GMT+5)
Remote: Yes
Willing to relocate: No
Technologies: Next.js, React, TypeScript, Tailwind, Supabase/Postgres, Vercel, OpenAI/Claude APIs, Telegram bots
Résumé/CV: ${SITE}/en/projects
Email: skyline.digital.uz@gmail.com

Solo studio building web apps, MVPs, e-commerce and AI chatbots end to end. Fixed-price quotes from a public calculator: ${SITE}/en/calculator`,
  },
  {
    id: "reddit-forhire",
    cadence: "weekly",
    day: 1,
    title: "r/forhire — еженедельный пост [For Hire]",
    url: "https://www.reddit.com/r/forhire/submit",
    text: `[For Hire] Next.js + Supabase web apps, e-commerce and AI chatbots — fixed price quotes

Solo developer from Tashkent (GMT+5), working remotely with clients worldwide.
What I build: marketing sites, online stores, web apps/MVPs with auth and admin panels, AI chatbots (RAG), Telegram bots, CRM integrations.
Stack: Next.js, TypeScript, Supabase/Postgres, Vercel.
Portfolio: ${SITE}/en/projects
Instant estimate: ${SITE}/en/calculator
DM me with a short description of the project.`,
  },
  {
    id: "upwork-profile",
    cadence: "monthly",
    day: 2,
    title: "Upwork / Contra — обновить портфолио последним кейсом",
    url: "https://www.upwork.com/freelancers/settings/profile",
    text: `1. Добавь в портфолио Upwork и Contra последний завершённый проект (задача → решение → результат, только реальные цифры).
2. Проверь Project Catalog: цены совпадают с калькулятором на сайте.
3. Проверь баланс Connects.
4. Ответь на все приглашения за месяц, даже отказом — это держит рейтинг ответов.`,
  },
  {
    id: "reviews",
    cadence: "monthly",
    day: 15,
    title: "Отзывы: Clutch и Google Maps",
    url: "https://clutch.co/profile",
    text: `Попроси отзыв у клиентов, проекты которых закрыты за последний месяц:
— Clutch (для международных и агентств),
— Google Maps / 2GIS (для Ташкента).
Шаблон: «Спасибо за проект. Если всё понравилось, оставьте пару строк отзыва — это очень помогает небольшой студии: <ссылка>».`,
  },
  {
    id: "tender-docs",
    cadence: "quarterly",
    day: 1,
    title: "Тендерные регистрации и документы — квартальная проверка",
    url: "https://www.ungm.org/Account/Account/Login",
    text: `1. UNGM: профиль актуален, коды UNSPSC и страны на месте.
2. UNDP Quantum: доступ работает.
3. Справка об отсутствии налоговой задолженности (my.soliq.uz) — не старше квартала.
4. CV в форматах World Bank и UN P11 — добавлены последние проекты.`,
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Дата в Ташкенте (UTC+5, без перехода на летнее время). */
export function tashkentParts(now: Date): { y: number; m: number; d: number; dow: number } {
  const t = new Date(now.getTime() + 5 * 3_600_000);
  const dow = t.getUTCDay() === 0 ? 7 : t.getUTCDay();
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow };
}

/** ISO-неделя для ключа периода weekly. */
function isoWeek(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad(week)}`;
}

export function periodKey(r: Routine, now: Date): string {
  const { y, m, d } = tashkentParts(now);
  if (r.cadence === "weekly") return isoWeek(y, m, d);
  if (r.cadence === "monthly") return `${y}-${pad(m)}`;
  return `${y}-Q${Math.ceil(m / 3)}`;
}

/**
 * Рутины, которые пора прислать: наступил их день в текущем периоде и
 * за этот период ещё не отправлялись. Пропущенный день (крон лёг) не теряется —
 * рутина уйдёт при первом прогоне после него.
 */
export function dueRoutines(now: Date, sentKeys: Set<string>, routines = ROUTINES): { routine: Routine; key: string }[] {
  const { m, d, dow } = tashkentParts(now);
  return routines
    .filter((r) => {
      if (r.cadence === "weekly") return dow >= r.day;
      if (r.cadence === "monthly") return d >= r.day;
      return (m - 1) % 3 === 0 ? d >= r.day : true; // квартал: с 1-го числа первого месяца
    })
    .map((r) => ({ routine: r, key: `${r.id}:${periodKey(r, now)}` }))
    .filter(({ key }) => !sentKeys.has(key));
}
