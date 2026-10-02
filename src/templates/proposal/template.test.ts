import { describe, it, expect } from "vitest";
import { renderProposalHtml } from "./template";
import { computePricing } from "@/lib/pricing/engine";
import type { Proposal } from "@/lib/ai/schema";

const pricing = computePricing({
  projectType: "website",
  features: ["multilang", "cms"],
  addons: [],
  urgency: "normal",
});

const meta = { projectName: "Магазин обуви «Шаг»", clientName: "ООО Шаг", hasEmail: true };

const full: Proposal = {
  projectTitle: "Магазин обуви «Шаг»",
  infraNarrative: "Покупатели заходят в каталог обуви, вы правите товары в админке, заказы падают вам в Telegram.",
  summary: "Нужен интернет-магазин обуви с каталогом и приёмом заказов.",
  objectives: ["Запустить онлайн-витрину обуви", "Принимать заказы без звонков"],
  scope: ["Каталог", "Корзина", "Админка", "Интеграция оплаты"],
  designRationale: "Чистая витрина с акцентом на фото обуви, адаптив под мобильные.",
  recommendedStack: ["Next.js", "PostgreSQL"],
  processIntro: "Путь покупателя обуви — от поиска до оплаченного заказа.",
  processSteps: [
    { title: "Ищет обувь", text: "Находит вас в поиске или рекламе." },
    { title: "Смотрит каталог", text: "Фильтрует по размеру и цвету." },
    { title: "Кладёт в корзину", text: "Выбирает пару и оформляет." },
    { title: "Оплачивает", text: "Онлайн-оплата, заказ падает вам." },
  ],
  checklistIntro: "Понадобятся фото обуви и каталог с ценами.",
  stageDeliverables: ["Дизайн витрины", "Каталог и корзина", "Оплата и админка", "Тесты и запуск"],
  whyUs: "Делаем магазины под ключ — от дизайна до оплаты.",
  nextStep: "Пришлите каталог обуви — подготовим финальное КП.",
};

describe("renderProposalHtml — строгий по-слайдовый шаблон", () => {
  it("рендерит уникальный контент клиента на всех слайдах", () => {
    const html = renderProposalHtml({ fxRate: 12000, proposal: full, pricing, configuration: {
      projectType: "website", features: ["multilang", "cms"], addons: [], urgency: "normal",
    }, meta });
    // Клиенто-специфичные нарративы каждого слайда присутствуют.
    expect(html).toContain("каталог обуви");
    expect(html).toContain("Путь покупателя обуви");
    expect(html).toContain("Ищет обувь");
    expect(html).toContain("Дизайн витрины");
    expect(html).toContain("Делаем магазины под ключ");
    expect(html).toContain("Пришлите каталог обуви");
    // Числа движка на месте, "undefined" нигде не протекло.
    expect(html).not.toContain("undefined");
  });

  it("устойчив к старой схеме КП (features/recommendations/nextSteps)", () => {
    // Смета, выданная до рефактора: старые поля, новых нет.
    const legacy = {
      projectTitle: "Старый проект",
      summary: "Старое описание.",
      objectives: ["Цель 1"],
      scope: ["Работа 1"],
      recommendedStack: ["Next.js"],
      features: ["Функция 1", "Функция 2"],
      recommendations: ["Рекомендуем созвон"],
      nextSteps: ["Свяжемся с вами"],
    } as unknown as Proposal;
    const html = renderProposalHtml({ fxRate: 12000, proposal: legacy, pricing, configuration: {
      projectType: "website", features: [], addons: [], urgency: "normal",
    }, meta });
    expect(html).not.toContain("undefined");
    // Миграция старых полей: nextSteps[0] → слайд закрытия.
    expect(html).toContain("Свяжемся с вами");
    // Дефолтные процессные шаги подставлены (слайд 4 не падает).
    expect(html).toContain("Путь клиента");
  });
});
