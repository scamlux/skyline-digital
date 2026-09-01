import type { Proposal } from "@/lib/ai/schema";
import type { PricingResult, ProjectConfiguration } from "@/lib/pricing/types";
import { ROLE_LABELS } from "@/lib/pricing/roles";
import ruMessages from "../../../messages/ru.json";

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

/** Deterministic "infrastructure" rows built from the configuration. */
function infraRows(cfg: ProjectConfiguration, projectName: string) {
  const f = new Set(cfg.features);
  const visitors: string[] = [projectName];
  if (f.has("multilingual")) visitors.push("3 языковые версии");
  visitors.push("Мобильная версия");

  const data: string[] = ["Тексты и изображения"];
  if (f.has("ecommerce") || f.has("payment") || f.has("payments")) data.push("Каталог и заказы");
  if (f.has("personalAccount") || f.has("authentication")) data.push("Аккаунты пользователей");
  if (f.has("rag") || f.has("knowledgeBase")) data.push("База знаний");
  data.push("Архив заявок");

  const leads: string[] = ["Telegram-уведомления", "Электронная почта"];
  if (f.has("crmIntegration")) leads.push("CRM");
  if (f.has("adminPanel")) leads.push("Админ-панель");

  const runsOn: string[] = ["Сервер (hosting)", "Домен", "SSL-сертификат", "Ежедневные копии"];

  return [
    { label: "Кто пользуется", items: visitors, note: "Ваши клиенты и менеджеры" },
    { label: "Где хранятся данные", items: data, note: "Всё в одной системе" },
    { label: "Куда уходят заявки", items: leads, note: "Ни одна заявка не теряется" },
    { label: "На чём всё работает", items: runsOn, note: "Технологная основа" },
  ];
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
  const urgencyAmount = pricing.urgencyAmount ?? 0;
  const hasCustom = pricing.hasCustom ?? false;
  const total = pricing.total ?? midTotal(pricing);
  const totalUzs = total * FX_RATE;
  const market = marketTable(pricing);
  const savingPct = Math.max(0, Math.round((1 - totalUzs / market.total) * 100));
  // The market anchor is a sales device (CLAUDE.md §9) — only ever show it when
  // it genuinely favours the client. Larger/urgent configs price above the
  // reference team, so a 0% "выгода" would undercut the pitch; hide it then.
  const showAnchor = savingPct > 0;
  const half = total / 2;
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
  .contact-strip { margin-top: 34px; background: #F4F6F9; border: 1px solid ${C.line}; border-radius: 10px; padding: 20px 24px; font-size: 15px; }
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
      Как устроен продукт: кто им пользуется, где хранятся данные и куда уходят заявки.
      <div class="muted small" style="margin-top:16px">Схема сгенерирована по конфигурации вашего проекта.</div>
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
        <div class="diagram-foot"><b>Главное простыми словами.</b> Посетители заходят, оставляют заявку — она мгновенно приходит вам и сохраняется в архиве. Ничего не теряется.</div>
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
        <h3>Технологии</h3>
        <div class="chips">${proposal.recommendedStack.slice(0, 6).map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>
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
        <div class="big">${usd(total)}</div>
        <div class="uzs">${uzs(totalUzs)} сум</div>
        ${showAnchor ? `<div class="save">выгода ${savingPct} %</div>` : ""}
      </div>
      <div class="price-note">Цена собрана из реальных часов по ролям — видно, за что вы платите.${
        showAnchor
          ? ` <s>${uzs(market.total)} сум</s> — столько же работ у команды из 6 человек по рыночным ставкам Ташкента.`
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
      <tr><td>${usd(half)} · ${uzs(half * FX_RATE)}</td><td>${usd(half)} · ${uzs(half * FX_RATE)}</td></tr>
    </table>
    <table class="totals">
      <tr><td>Сумма проекта (USD):</td><td>${usd(total)}</td></tr>
      <tr><td>Итого (UZS):</td><td>${uzs(totalUzs)}</td></tr>
      <tr><td class="muted">Со второго года:</td><td>$180 / год</td></tr>
      <tr><td class="muted">Правки после запуска:</td><td>от $15</td></tr>
    </table>
  </div>
  <div class="footnote">Оплата в сумах по курсу на день платежа (в расчёте — ${uzs(FX_RATE)}). Второй платёж — после запуска и подписания акта.</div>
  <div class="contact-strip"><b>Связаться:</b> Skyline Digital · Ташкент · sky-digital-agency.vercel.app <b style="margin-left:18px">Следующий шаг:</b> ${esc(proposal.nextSteps[0] ?? "подтвердить проект и бюджет")}</div>
  ${logo}${pageNo(8)}
</section>

</body>
</html>`;
}
