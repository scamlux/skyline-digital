import type { Proposal } from "@/lib/ai/schema";
import type { PricingResult, ProjectConfiguration } from "@/lib/pricing/types";
import { ROLE_LABELS } from "@/lib/pricing/roles";
import { CONTACTS, CONTACT_LINKS, telegramHandle } from "@/lib/contact";
import ruMessages from "../../../messages/ru.json";

/** Public brand domain shown on the deck (not the deployment alias). */
const BRAND_DOMAIN = "skyline-digital.uz";

/**
 * Commercial proposal deck — 8 slides, 16:9, modeled on the reference
 * "КП — Сайт TGPG.UZ". Every visual (infrastructure diagram, client journey,
 * checklist, stage columns, pricing tables) is generated from estimate data —
 * no external Miro/Sheets. The AI supplies only text content; all numbers come
 * from the deterministic pricing engine.
 */

export interface ProposalRenderInput {
  proposal: Proposal;
  pricing: PricingResult;
  configuration: ProjectConfiguration;
  meta: {
    date?: string;
    clientName?: string;
    projectName: string;
  };
}

/* ——— Reference palette (Arial, white bg, ink/blue/orange) ——— */
const C = {
  ink: "#1A1A1A",
  blue: "#0B4EA2",
  link: "#1155CC",
  grey: "#6B7480",
  lightGrey: "#9AA3AE",
  line: "#E3E7EC",
  tableHead: "#C9D8EE",
  tableRowA: "#EDF2FA",
  tableRowB: "#F7FAFD",
  cream: "#FDEBD3",
  creamText: "#B4690E",
  orange: "#F0913A",
  red: "#C8392B",
  night: "#1A2238",
};

/* ——— Tashkent market rates (сум/мес) — from the pricing brief ——— */
const MARKET_TEAM = [
  { role: "Проект-менеджер", rate: 15_000_000, load: 0.2 },
  { role: "Разработчик", rate: 15_000_000, load: 1.0 },
  { role: "Дизайнер", rate: 14_000_000, load: 0.3 },
  { role: "Тестировщик", rate: 11_000_000, load: 0.25 },
  { role: "DevOps", rate: 18_000_000, load: 0.15 },
  { role: "Контент-менеджер", rate: 9_400_000, load: 0.25 },
];

const FX_RATE = 12_000; // сум за $1 — справочный курс

const FEATURE_LABELS: Record<string, string> = (
  ruMessages as { calc: { features: Record<string, string> } }
).calc.features;

const TYPE_LABELS: Record<string, string> = {
  website: "Сайт",
  webApp: "Веб-приложение",
  mobileApp: "Мобильное приложение",
  ai: "AI-решение",
  automation: "Автоматизация",
  uiux: "UI/UX-дизайн",
  other: "Проект",
};

/* ——— helpers ——— */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const uzs = (n: number) =>
  Math.round(n)
    .toLocaleString("ru-RU")
    .replace(/ /g, " ");

function midTotal(p: PricingResult): number {
  return Math.round((p.totalMin + p.totalMax) / 2 / 50) * 50;
}

/**
 * Deterministic "infrastructure" rows built from the configuration. Framed
 * around the client's real touchpoints — where they actually see and manage
 * their data (admin/CMS, database, Telegram, CRM) — not abstract boxes, so the
 * "как устроена система" slide reads logically to a non-technical reader.
 */
function infraRows(cfg: ProjectConfiguration, projectName: string) {
  const f = new Set(cfg.features);

  // Who uses it.
  const visitors: string[] = [projectName];
  if (f.has("multilingual")) visitors.push("3 языка");
  visitors.push("Мобильная версия");

  // Where the client manages content and sees their data.
  const manage: string[] = [
    f.has("adminPanel") || f.has("cms") ? "Админ-панель (CMS)" : "Админ-панель",
    "База данных проекта",
  ];
  if (f.has("ecommerce") || f.has("payment") || f.has("payments"))
    manage.push("Каталог и заказы");
  if (f.has("personalAccount") || f.has("authentication"))
    manage.push("Кабинеты клиентов");
  if (f.has("rag") || f.has("knowledgeBase")) manage.push("База знаний");

  // Where every incoming lead lands — and where the client reads it.
  const leads: string[] = ["Telegram", "Электронная почта"];
  if (f.has("crmIntegration")) leads.push("CRM");
  leads.push("Архив в админ-панели");

  // What we set up and keep running for them.
  const runsOn: string[] = ["Хостинг + домен", "SSL (https)", "Ежедневные копии"];

  return [
    { label: "Кто пользуется", items: visitors, note: "Ваши клиенты" },
    { label: "Где вы управляете", items: manage, note: "Заходите и видите всё сами" },
    { label: "Где видите заявки", items: leads, note: "Ни одна не теряется" },
    { label: "На чём всё работает", items: runsOn, note: "Настраиваем и поддерживаем" },
  ];
}

/**
 * Deterministic tech story for the "Понимание задачи" slide: a few plain-language
 * principles plus a simplified modern stack, tailored to the configuration.
 * Intentionally NOT over-architected — the point is to show competence without
 * scaring a non-technical client with jargon.
 */
function techApproach(cfg: ProjectConfiguration, aiStack: string[]) {
  const f = new Set(cfg.features);
  const principles = [
    "Компонентный подход — переиспользуемые блоки, быстрее правки",
    "Рендеринг на сервере: быстрая загрузка и хорошее SEO",
    "Mobile-first — сначала мобильные, потом десктоп",
  ];

  const stack: string[] = ["Next.js / React", "TypeScript", "Tailwind CSS", "PostgreSQL"];
  if (cfg.projectType === "ai" || f.has("rag") || f.has("knowledgeBase"))
    stack.push("AI (Anthropic API)");
  if (f.has("ecommerce") || f.has("payment") || f.has("payments"))
    stack.push("Онлайн-оплата (Payme / Click)");
  if (f.has("crmIntegration")) stack.push("Интеграция с CRM");
  if (f.has("adminPanel") || f.has("cms")) stack.push("Админка на том же стеке");

  // Fold in any distinct AI-suggested tech, but keep the list tight.
  for (const s of aiStack) {
    if (stack.length >= 8) break;
    const norm = s.trim();
    if (norm && !stack.some((x) => x.toLowerCase().includes(norm.toLowerCase())))
      stack.push(norm);
  }
  return { principles, stack: stack.slice(0, 8) };
}

/** Deterministic 6-step client journey. */
function journeySteps(cfg: ProjectConfiguration) {
  const t = TYPE_LABELS[cfg.projectType] ?? "Продукт";
  return [
    { title: "Клиент ищет решение", text: "Google, рекомендации или реклама приводят его к вам." },
    { title: `Попадает в ${t.toLowerCase()}`, text: "Первый экран сразу отвечает: кто вы и чем полезны." },
    { title: "Изучает и убеждается", text: "Услуги, кейсы и цифры снимают вопросы доверия." },
    { title: "Оставляет заявку", text: "Короткая форма — имя и контакт, ничего лишнего." },
    { title: "Заявка приходит мгновенно", text: "Telegram и почта — уведомление за 2–3 секунды." },
    { title: "Менеджер связывается", text: "Контакт, история и контекст уже под рукой." },
  ];
}

/** Deterministic "we expect from the client" checklist. */
function clientChecklist(cfg: ProjectConfiguration) {
  const f = new Set(cfg.features);
  const groups: { group: string; items: string[] }[] = [
    {
      group: "Доступы",
      items: [
        "Доступ к домену (или выбор нового)",
        "Почта для приёма заявок",
        "Telegram-чат для уведомлений",
      ],
    },
    {
      group: "Команда со стороны клиента",
      items: ["Ответственный за проект", "Пользователи для теста"],
    },
    {
      group: "Материалы",
      items: [
        "Логотип и фирменные материалы",
        "Тексты или тезисы о компании",
        ...(f.has("ecommerce") ? ["Каталог товаров с ценами"] : []),
        ...(f.has("rag") || f.has("knowledgeBase") ? ["Документы для базы знаний"] : []),
      ],
    },
  ];
  return groups;
}

/** Split estimatedWeeks into 4 stage columns like the reference. */
function stageColumns(pricing: PricingResult, proposal: Proposal) {
  const w = Math.max(2, pricing.estimatedWeeks);
  const q = w / 4;
  const rng = (a: number, b: number) =>
    Math.round(a) === Math.round(b)
      ? `${Math.round(a)} неделя`
      : `${Math.round(a)}–${Math.round(b)} неделя`;
  const labels = [rng(1, q), rng(q, q * 2), rng(q * 2, q * 3), rng(q * 3, w)];
  const defaults = [
    "Инициация,\nдизайн,\nсервер",
    "Разработка\nосновных\nэкранов",
    "Наполнение,\nзаявки,\nинтеграции",
    "Тестирование,\nобучение,\nзапуск",
  ];
  // Use AI phases only when they map 1:1 onto the four columns; otherwise the
  // deterministic defaults (padding AI phases duplicates content).
  const aiPhases = proposal.timeline.phases.map((p) =>
    p.replace(/^(Этап|Фаза|Phase|Stage)\s*\d+\s*[:.—-]?\s*/i, "").replace(/\s*\(.*?\)\s*$/, ""),
  );
  const phases = aiPhases.length === 4 ? aiPhases : defaults;
  const colors = ["#178E8E", "#9C34D0", "#F0913A", "#5CB85C"];
  return labels.map((label, i) => ({ label, text: phases[i], color: colors[i] }));
}

/** Market estimate table: months scale with project duration. */
function marketTable(pricing: PricingResult) {
  const months = Math.max(1, Math.round((pricing.estimatedWeeks / 4) * 10) / 10);
  const rows = MARKET_TEAM.map((m) => ({
    ...m,
    months,
    sum: Math.round(m.rate * m.load * months),
  }));
  const total = rows.reduce((s, r) => s + r.sum, 0);
  return { rows, total, months };
}

export function renderProposalHtml(input: ProposalRenderInput): string {
  const { proposal, pricing, configuration, meta } = input;
  // Guard: estimates snapshotted before the open-unit-economics rollout have no
  // roleBreakdown/subtotal/total — fall back to the mid-range figure so old
  // proposals still render.
  const breakdown = pricing.roleBreakdown ?? [];
  const subtotal = pricing.subtotal ?? midTotal(pricing);
  const rawUrgency = pricing.urgencyAmount ?? 0;
  const hasCustom = pricing.hasCustom ?? false;
  const rawTotal = pricing.total ?? midTotal(pricing);
  // Tidy the headline: when there's an urgency surcharge (a soft %), round the
  // total to a clean $10 and absorb the few-dollar delta into the urgency line.
  // The role breakdown and its subtotal stay exact, so "часы × ставка → подытог"
  // still adds up; only the elastic urgency figure moves. Without urgency we
  // keep the exact figure (nothing to absorb into).
  const total = rawUrgency > 0 ? Math.round(rawTotal / 10) * 10 : rawTotal;
  const urgencyAmount = rawUrgency > 0 ? total - subtotal : 0;
  const totalUzs = total * FX_RATE;
  const market = marketTable(pricing);
  const savingPct = Math.max(0, Math.round((1 - totalUzs / market.total) * 100));
  // The market anchor is a sales device (CLAUDE.md §9) — only ever show it when
  // it genuinely favours the client. Larger/urgent configs price above the
  // reference team, so a 0% "выгода" would undercut the pitch; hide it then.
  const showAnchor = savingPct > 0;
  // "Без скидки" comparison in USD, so it reads next to ВАША ЦЕНА in the same
  // unit. Ceil to a clean $50 for a tidy strike-through figure.
  const listUsd = Math.ceil(market.total / FX_RATE / 50) * 50;
  // Payment split: round the prepayment to a clean $10 and let the balance be
  // the exact remainder, so the two rows still sum to ВАША ЦЕНА (point 4).
  const prepay = Math.round(total / 2 / 10) * 10;
  const postpay = total - prepay;
  const approach = techApproach(configuration, proposal.recommendedStack);
  const infra = infraRows(configuration, meta.projectName);
  const journey = journeySteps(configuration);
  const checklist = clientChecklist(configuration);
  const stages = stageColumns(pricing, proposal);
  const year = meta.date?.match(/\d{4}/)?.[0] ?? "2026";
  const featureList = configuration.features.map((k) => FEATURE_LABELS[k] ?? k);

  const logo = `<div class="logo">skyline<span class="logo-dot">.</span>digital</div>`;
  const pageNo = (n: number) => `<div class="pageno">${n}</div>`;
  const slideTitle = (t: string) => `<h2 class="slide-title">${esc(t)}</h2>`;

  const li = (items: string[], cls = "") =>
    items.map((i) => `<li class="${cls}">${esc(i)}</li>`).join("");

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { font-family: Arial, Helvetica, sans-serif; color: ${C.ink}; background: #fff; }
  .slide {
    width: 1280px; height: 720px; position: relative;
    padding: 64px 72px 70px; overflow: hidden;
    page-break-after: always; background: #fff;
  }
  .slide:last-child { page-break-after: auto; }
  .logo { position: absolute; left: 72px; bottom: 34px; font-weight: bold; font-size: 19px; letter-spacing: 0.5px; color: ${C.night}; }
  .logo-dot { color: ${C.orange}; }
  .pageno { position: absolute; right: 72px; bottom: 36px; font-size: 14px; color: ${C.lightGrey}; }
  .slide-title { font-size: 40px; font-weight: bold; margin-bottom: 26px; }
  .muted { color: ${C.grey}; }
  .small { font-size: 13px; }

  /* Cover */
  .cover-eyebrow { font-size: 15px; letter-spacing: 3px; color: ${C.lightGrey}; text-transform: uppercase; margin-bottom: 120px; }
  .cover h1 { font-size: 52px; line-height: 1.18; font-weight: bold; }
  .cover .accent { color: ${C.blue}; text-transform: uppercase; }
  .cover-meta { margin-top: 72px; font-size: 18px; color: ${C.ink}; }
  .cover-sub { margin-top: 12px; font-size: 15px; color: ${C.grey}; }
  .cover-line { position: absolute; left: 0; right: 0; bottom: 0; height: 6px;
    background: linear-gradient(90deg, #FFAE5C, #E8517C); }

  /* Two-column: text left, visual right */
  .cols { display: flex; gap: 48px; }
  .col-l { width: 330px; flex-shrink: 0; font-size: 17px; line-height: 1.55; color: ${C.ink}; }
  .col-r { flex: 1; }

  /* Infra diagram */
  .diagram { border: 1px solid ${C.line}; border-radius: 10px; overflow: hidden; }
  .diagram-head { background: ${C.blue}; color: #fff; padding: 13px 20px; font-size: 16px; font-weight: bold; }
  .diagram-row { display: flex; border-top: 1px solid ${C.line}; }
  .diagram-label { width: 200px; flex-shrink: 0; padding: 14px 16px; font-size: 13px; font-weight: bold; }
  .diagram-label .note { font-weight: normal; color: ${C.lightGrey}; font-size: 11px; margin-top: 3px; }
  .diagram-items { flex: 1; display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px; align-items: center; }
  .chip { background: ${C.tableRowA}; border: 1px solid #D5E1F2; color: ${C.ink}; font-size: 12.5px; padding: 6px 12px; border-radius: 6px; }
  .diagram-foot { border-top: 1px solid ${C.line}; background: ${C.cream}; color: ${C.creamText}; font-size: 12.5px; padding: 11px 16px; }

  /* Understanding slide */
  .understand-card { border: 1px solid ${C.line}; border-radius: 10px; padding: 22px 24px; margin-bottom: 14px; }
  .understand-card h3 { font-size: 15px; color: ${C.blue}; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .understand-card ul { list-style: none; }
  .understand-card li { font-size: 14.5px; line-height: 1.5; padding-left: 16px; position: relative; margin-bottom: 6px; }
  .understand-card li:before { content: "—"; position: absolute; left: 0; color: ${C.orange}; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }

  /* Journey */
  .journey { border: 1px solid ${C.line}; border-radius: 10px; overflow: hidden; }
  .journey-head { background: ${C.blue}; color: #fff; padding: 13px 20px; font-size: 16px; font-weight: bold; }
  .step { display: flex; gap: 14px; padding: 11px 18px; border-top: 1px solid ${C.line}; align-items: flex-start; }
  .step-num { width: 26px; height: 26px; border-radius: 50%; background: ${C.blue}; color: #fff; font-size: 13px; font-weight: bold; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step b { font-size: 14px; display: block; margin-bottom: 2px; }
  .step p { font-size: 12.5px; color: ${C.grey}; line-height: 1.4; }

  /* Checklist table */
  table.check { border-collapse: collapse; width: 640px; }
  table.check td { padding: 12px 16px; font-size: 15px; }
  tr.group td { background: ${C.tableHead}; font-weight: bold; }
  tr.item td:first-child { background: ${C.tableRowA}; width: 430px; }
  tr.item td:last-child { background: ${C.cream}; color: ${C.creamText}; }
  tr.item { border-top: 2px solid #fff; }

  /* Stages */
  .stages { display: flex; gap: 34px; margin-top: 18px; }
  .stage { flex: 1; }
  .stage-week { border: 1px solid ${C.line}; background: #F4F6F9; border-radius: 8px; text-align: center; padding: 10px 6px; font-size: 14.5px; font-weight: bold; margin-bottom: 20px; }
  .stage-box { border-radius: 14px; border: 2px solid ${C.ink}; color: #fff; height: 300px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 18px; font-weight: bold; line-height: 1.5; padding: 18px; white-space: pre-line; }

  /* Pricing */
  table.price { border-collapse: collapse; width: 690px; }
  table.price th { background: ${C.ink}; color: #fff; font-size: 14px; padding: 11px 14px; text-align: right; }
  table.price th:first-child { text-align: left; }
  table.price td { font-size: 14.5px; padding: 10px 14px; text-align: right; border: 1px solid ${C.line}; }
  table.price td:first-child { text-align: left; }
  table.price tr:nth-child(even) td { background: ${C.tableRowB}; }
  .market-total td { font-weight: bold; }
  .market-total .strike { color: ${C.red}; text-decoration: line-through; }
  .price-card { border: 3px solid ${C.ink}; background: ${C.orange}; border-radius: 12px; color: #fff; width: 300px; padding: 24px 26px; text-align: center; }
  .price-card .cap { font-size: 14px; letter-spacing: 3px; margin-bottom: 12px; }
  .price-card .was { font-size: 12px; color: rgba(255,255,255,0.9); letter-spacing: 1px; margin-bottom: 4px; }
  .price-card .was .wasnum { font-size: 20px; text-decoration: line-through; text-decoration-thickness: 2px; margin-right: 7px; }
  .price-card .big { font-size: 46px; font-weight: bold; }
  .price-card .uzs { font-size: 16px; margin-top: 8px; }
  .price-card .save { display: inline-block; margin-top: 12px; background: rgba(255,255,255,0.25); font-size: 13px; font-weight: bold; padding: 5px 12px; border-radius: 6px; }
  .price-note { font-size: 13px; color: ${C.grey}; line-height: 1.5; margin-top: 16px; width: 300px; }
  .footnote { font-size: 12.5px; color: ${C.grey}; margin-top: 22px; line-height: 1.5; max-width: 1080px; }

  /* Payment */
  table.pay { border-collapse: collapse; width: 470px; }
  table.pay th { background: ${C.ink}; color: #fff; font-size: 15px; padding: 12px 18px; text-align: left; }
  table.pay td { font-size: 16px; font-weight: bold; padding: 14px 18px; border: 1px solid ${C.line}; }
  table.totals { border-collapse: collapse; width: 360px; }
  table.totals td { font-size: 14.5px; padding: 12px 16px; border: 1px solid ${C.line}; }
  table.totals tr:first-child td { background: ${C.tableRowA}; font-weight: bold; }
  table.totals td:last-child { text-align: right; font-weight: bold; }
  .contact-card { margin-top: 30px; display: flex; border: 1px solid ${C.line}; border-radius: 12px; overflow: hidden; }
  .contact-main { flex: 1; padding: 20px 26px; background: #F7FAFD; }
  .contact-brand-name { font-size: 19px; font-weight: bold; color: ${C.ink}; }
  .contact-brand-sub { font-size: 12.5px; color: ${C.grey}; margin-top: 3px; }
  .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 30px; margin-top: 18px; }
  .ci { display: flex; flex-direction: column; gap: 3px; }
  .ci-l { font-size: 10.5px; letter-spacing: 1.3px; text-transform: uppercase; color: ${C.lightGrey}; }
  .ci-v { font-size: 15px; color: ${C.ink}; font-weight: 600; text-decoration: none; }
  a.ci-v { color: ${C.link}; }
  .contact-next { width: 290px; flex-shrink: 0; background: ${C.cream}; color: ${C.creamText}; padding: 22px 24px; display: flex; flex-direction: column; justify-content: center; }
  .contact-next-l { font-size: 11px; letter-spacing: 1.6px; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; opacity: 0.85; }
  .contact-next-v { font-size: 15.5px; line-height: 1.5; font-weight: 600; }
</style>
</head>
<body>

<!-- 1 · Cover -->
<section class="slide cover">
  <div class="cover-eyebrow">Skyline Digital · ${esc(year)}</div>
  <h1>Коммерческое предложение<br/>для разработки:<br/><span class="accent">${esc(meta.projectName)}</span></h1>
  <div class="cover-meta">${esc(meta.clientName ?? "")}</div>
  <div class="cover-sub">Skyline Digital · Ташкент, ${esc(year)}</div>
  ${logo}${pageNo(1)}
  <div class="cover-line"></div>
</section>

<!-- 2 · Infrastructure diagram -->
<section class="slide">
  ${slideTitle("Как устроена система")}
  <div class="cols">
    <div class="col-l">
      Без технических терминов: кто пользуется системой, где вы сами управляете
      контентом и в каком месте видите каждую заявку.
      <div class="muted small" style="margin-top:16px">Схема собрана по конфигурации вашего проекта.</div>
    </div>
    <div class="col-r">
      <div class="diagram">
        <div class="diagram-head">Как устроен ${esc(TYPE_LABELS[configuration.projectType] ?? "проект").toLowerCase()}</div>
        ${infra
          .map(
            (r) => `
        <div class="diagram-row">
          <div class="diagram-label">${esc(r.label)}<div class="note">${esc(r.note)}</div></div>
          <div class="diagram-items">${r.items.map((i) => `<span class="chip">${esc(i)}</span>`).join("")}</div>
        </div>`,
          )
          .join("")}
        <div class="diagram-foot"><b>Главное простыми словами.</b> Заявки приходят в Telegram и на почту, контент вы меняете сами в админ-панели, а все данные хранятся в базе и ежедневно копируются. Ничего не теряется.</div>
      </div>
    </div>
  </div>
  ${logo}${pageNo(2)}
</section>

<!-- 3 · Understanding -->
<section class="slide">
  ${slideTitle("Понимание задачи")}
  <div class="cols">
    <div class="col-l">${esc(proposal.summary)}</div>
    <div class="col-r">
      <div class="understand-card">
        <h3>Цели проекта</h3>
        <ul>${li(proposal.objectives.slice(0, 4))}</ul>
      </div>
      <div class="understand-card">
        <h3>Выбранные функции</h3>
        <div class="chips">${featureList.map((f) => `<span class="chip">${esc(f)}</span>`).join("")}</div>
      </div>
      <div class="understand-card">
        <h3>Технологии и подход</h3>
        <ul>${li(approach.principles)}</ul>
        <div class="chips" style="margin-top:12px">${approach.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>
      </div>
    </div>
  </div>
  ${logo}${pageNo(3)}
</section>

<!-- 4 · Client journey -->
<section class="slide">
  ${slideTitle("Бизнес-процесс системы")}
  <div class="cols">
    <div class="col-l">Путь клиента: от поиска до заявки у вас в Telegram — шесть шагов.</div>
    <div class="col-r">
      <div class="journey">
        <div class="journey-head">Путь клиента</div>
        ${journey
          .map(
            (s, i) => `
        <div class="step"><div class="step-num">${i + 1}</div><div><b>${esc(s.title)}</b><p>${esc(s.text)}</p></div></div>`,
          )
          .join("")}
      </div>
    </div>
  </div>
  ${logo}${pageNo(4)}
</section>

<!-- 5 · Client checklist -->
<section class="slide">
  ${slideTitle("От клиента ждём")}
  <div class="cols">
    <div class="col-r">
      <table class="check">
        ${checklist
          .map(
            (g) => `
        <tr class="group"><td colspan="2">${esc(g.group)}</td></tr>
        ${g.items.map((i) => `<tr class="item"><td>${esc(i)}</td><td>Не сделано</td></tr>`).join("")}`,
          )
          .join("")}
      </table>
    </div>
    <div class="col-l" style="padding-top:8px">Эти материалы нужны по ходу работы — начать можно без них, соберём вместе на первой неделе.</div>
  </div>
  ${logo}${pageNo(5)}
</section>

<!-- 6 · Stages -->
<section class="slide">
  ${slideTitle("Этапы разработки")}
  <div class="stages">
    ${stages
      .map(
        (s) => `
    <div class="stage">
      <div class="stage-week">${esc(s.label)}</div>
      <div class="stage-box" style="background:${s.color}">${esc(s.text)}</div>
    </div>`,
      )
      .join("")}
  </div>
  <div class="footnote">Срок всего проекта — ${pricing.estimatedWeeks} нед. Каждую неделю показываем прогресс.</div>
  ${logo}${pageNo(6)}
</section>

<!-- 7 · Price -->
<section class="slide">
  ${slideTitle("Сумма проекта")}
  <div style="display:flex; gap:40px">
    <div>
      <table class="price">
        <tr><th>Роль</th><th>Часы</th><th>Ставка, $/ч</th><th>Сумма</th></tr>
        ${
          breakdown.length > 0
            ? breakdown
                .map(
                  (r) => `
        <tr><td>${esc(ROLE_LABELS[r.role])}</td><td>${r.hours.toLocaleString("ru-RU")}</td><td>${usd(r.rate)}</td><td>${usd(r.sum)}</td></tr>`,
                )
                .join("")
            : `<tr><td colspan="3">Стоимость проекта</td><td>${usd(subtotal)}</td></tr>`
        }
        <tr class="market-total"><td colspan="3">Подытог:</td><td>${usd(subtotal)}</td></tr>
        ${
          urgencyAmount > 0
            ? `<tr><td colspan="3">Срочный запуск (+35%):</td><td>+${usd(urgencyAmount)}</td></tr>`
            : ""
        }
        ${
          hasCustom
            ? `<tr><td colspan="3">Другое (по запросу):</td><td>обсуждается</td></tr>`
            : ""
        }
      </table>
    </div>
    <div>
      <div class="price-card">
        <div class="cap">ВАША ЦЕНА</div>
        ${showAnchor ? `<div class="was"><span class="wasnum">${usd(listUsd)}</span>без скидки</div>` : ""}
        <div class="big">${usd(total)}</div>
        <div class="uzs">${uzs(totalUzs)} сум</div>
        ${showAnchor ? `<div class="save">выгода ${savingPct} %</div>` : ""}
      </div>
      <div class="price-note">Цена собрана из реальных часов по ролям — видно, за что вы платите.${
        showAnchor
          ? ` Сумма без скидки (${usd(listUsd)}) — столько же работ стоит у команды из 6 человек по рыночным ставкам Ташкента.`
          : ""
      }</div>
    </div>
  </div>
  <div class="footnote">Каждая строка — часы роли × почасовая ставка; суммы складываются в подытог. · Вилка сметы: ${usd(pricing.totalMin)}–${usd(pricing.totalMax)}; в КП указана итоговая. · Хостинг, домен и SSL на первый год включены.${hasCustom ? " · Пункт «Другое» оценивается индивидуально и в сумму выше не входит." : ""}</div>
  ${logo}${pageNo(7)}
</section>

<!-- 8 · Payment -->
<section class="slide">
  ${slideTitle("График оплаты")}
  <div style="display:flex; gap:44px">
    <table class="pay">
      <tr><th>Предоплата</th><th>После запуска</th></tr>
      <tr><td>${usd(prepay)} · ${uzs(prepay * FX_RATE)}</td><td>${usd(postpay)} · ${uzs(postpay * FX_RATE)}</td></tr>
    </table>
    <table class="totals">
      <tr><td>Сумма проекта (USD):</td><td>${usd(total)}</td></tr>
      <tr><td>Итого (UZS):</td><td>${uzs(totalUzs)}</td></tr>
      <tr><td class="muted">Со второго года:</td><td>$180 / год</td></tr>
      <tr><td class="muted">Правки после запуска:</td><td>от $15</td></tr>
    </table>
  </div>
  <div class="footnote">Оплата в сумах по курсу на день платежа (в расчёте — ${uzs(FX_RATE)}). Второй платёж — после запуска и подписания акта.</div>
  <div class="contact-card">
    <div class="contact-main">
      <div class="contact-brand-name">Skyline Digital</div>
      <div class="contact-brand-sub">Ташкент · веб-разработка, приложения и AI</div>
      <div class="contact-grid">
        <div class="ci"><span class="ci-l">Сайт</span><a class="ci-v" href="https://${BRAND_DOMAIN}">${BRAND_DOMAIN}</a></div>
        <div class="ci"><span class="ci-l">Телефон</span><a class="ci-v" href="${CONTACT_LINKS.phone}">${esc(CONTACTS.phoneDisplay)}</a></div>
        <div class="ci"><span class="ci-l">Telegram</span><a class="ci-v" href="${CONTACT_LINKS.telegram}">${esc(telegramHandle)}</a></div>
        <div class="ci"><span class="ci-l">E-mail</span><a class="ci-v" href="${CONTACT_LINKS.email}">${esc(CONTACTS.email)}</a></div>
      </div>
    </div>
    <div class="contact-next">
      <div class="contact-next-l">Следующий шаг</div>
      <div class="contact-next-v">→ ${esc(proposal.nextSteps[0] ?? "Подтвердите проект и выберите предпочтительный вариант бюджета.")}</div>
    </div>
  </div>
  ${logo}${pageNo(8)}
</section>

</body>
</html>`;
}
