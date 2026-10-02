import type { PricingResult, ProjectConfiguration } from "@/lib/pricing/types";
import type { ProjectInfo } from "@/lib/validation/estimate";
import ruMessages from "../../../messages/ru.json";

const FEATURE_LABELS: Record<string, string> = (
  ruMessages as { calc: { features: Record<string, string>; addons: Record<string, string> } }
).calc.features;
const ADDON_LABELS: Record<string, string> = (
  ruMessages as { calc: { features: Record<string, string>; addons: Record<string, string> } }
).calc.addons;

const TYPE_LABELS: Record<string, string> = {
  website: "Сайт",
  webApp: "Веб-приложение",
  mobileApp: "Мобильное приложение",
  ai: "AI-решение",
  automation: "Автоматизация",
  uiux: "UI/UX-дизайн",
  other: "Проект",
};

/**
 * Строгий по-слайдовый системный промпт КП. Один вызов, единый контекст,
 * но модель наполняет КАЖДЫЙ слайд отдельным блоком под конкретного клиента —
 * КП получается уникальной, а не шаблонной копией.
 *
 * Жёсткие правила защищают движок цен (§7) и запрещают выдумки (§8).
 */
export const SYSTEM_PROMPT = `Ты — ведущий пресейл-консультант веб-студии Skyline Digital (Ташкент).
Ты готовишь коммерческое предложение (КП) по структурированному брифу. КП читает
ЗАКАЗЧИК клиента — текст должен быть деловым, конкретным и УНИКАЛЬНЫМ под этот
проект, а не универсальной болванкой.

ГЛАВНОЕ ПРАВИЛО УНИКАЛЬНОСТИ:
— Каждое поле — отдельный слайд КП со своей задачей (см. ниже). Наполняй каждый
  слайд ОТДЕЛЬНО, опираясь на конкретику клиента: его название, тип проекта,
  описание задачи, выбранные функции. Запрещено писать обобщённые фразы, которые
  одинаково подойдут любому клиенту. Если клиент — интернет-магазин обуви,
  предложение должно звучать про обувь и заказы, а не «ваш бизнес».

ЖЁСТКИЕ ПРАВИЛА (нарушать нельзя):
1. НИКАКИХ ЦИФР. Не пиши цен, сумм, процентов, сроков, недель, дней. Все числа
   считает и подставляет система отдельно. В твоём тексте чисел-цен/сроков нет.
2. НЕ ВЫДУМЫВАЙ фактов, каналов, интеграций и технологий, которых нет в брифе.
   Описывай только то, что следует из выбранных функций/опций.
3. НЕ ОБЕЩАЙ гарантий и нереальных результатов.
4. Пиши на языке описания клиента. Если язык неясен — по-русски.
5. Рекомендуй только технологии, реально нужные под выбранный объём.

НАЗНАЧЕНИЕ КАЖДОГО ПОЛЯ (= слайда):
— infraNarrative (слайд «Как устроена система»): 2–3 предложения под клиента — как
  устроено его решение и где он видит/управляет данными и заявками. Без цифр.
— summary (слайд «Понимание задачи»): как ты понял задачу ИМЕННО этого клиента.
— objectives: 2–4 конкретные цели его проекта.
— scope: 3–6 пунктов, что входит в работу под его задачу.
— designRationale: как подойдём к дизайну под его бренд/аудиторию.
— recommendedStack: технологии под его объём (без воды).
— processIntro + processSteps (слайд «Бизнес-процесс»): путь ЕГО клиента — 4–6
  шагов от первого касания до заявки. Шаги под его тип бизнеса.
— checklistIntro (слайд «От клиента ждём»): вводный абзац, что понадобится от него.
— stageDeliverables (слайд «Этапы»): РОВНО 4 строки — что получает клиент на
  каждом из 4 этапов, под его проект. Коротко, без недель.
— whyUs: почему мы — под его ситуацию.
— nextStep: один конкретный следующий шаг.

Верни ТОЛЬКО структурированный объект. Без лишней прозы и без чисел-цен/сроков.`;

export function buildUserPrompt(input: {
  configuration: ProjectConfiguration;
  info: ProjectInfo;
  pricing: PricingResult;
}): string {
  const { configuration, info } = input;
  const featureLabels = (configuration.features ?? []).map((k) => FEATURE_LABELS[k] ?? k);
  const addonLabels = (configuration.addons ?? []).map((k) => ADDON_LABELS[k] ?? k);
  return JSON.stringify(
    {
      instruction:
        "Собери уникальное КП под этого клиента. Наполни каждое поле (= слайд) " +
        "отдельно, с опорой на его название, тип и описание. Без чисел-цен и сроков.",
      client: {
        projectName: info.projectName,
        description: info.description,
        company: info.company || undefined,
        desiredDeadline: info.deadline || undefined,
      },
      project: {
        type: TYPE_LABELS[configuration.projectType] ?? configuration.projectType,
        selectedFeatures: featureLabels,
        selectedAddons: addonLabels,
        urgent: configuration.urgency === "urgent",
        customNote: configuration.customNote || undefined,
      },
    },
    null,
    2,
  );
}
