import type { L, Locale } from "./types";

/** Путь с учётом локали: ru — без префикса (localePrefix: as-needed), en/uz — с префиксом. */
export const localePath = (locale: Locale, path: string) => (locale === "ru" ? path : `/${locale}${path}`);

/** Тексты витрины /sites и слоя «демо» над шаблоном (это не часть самого шаблона). */
export const demoUi = {
  badge: { ru: "Демо", en: "Demo", uz: "Demo" },
  ribbon: {
    ru: "Так будет выглядеть ваш сайт",
    en: "This is how your site will look",
    uz: "Saytingiz shunday koʻrinadi",
  },
  style: { ru: "Стиль", en: "Style", uz: "Uslub" },
  order: { ru: "Заказать за 50 $/мес", en: "Order for $50/mo", uz: "Oyiga 50 $ ga buyurtma" },
  back: { ru: "Все шаблоны", en: "All templates", uz: "Barcha shablonlar" },
  showroomTitle: {
    ru: "Сайты для бизнеса по подписке",
    en: "Business websites on subscription",
    uz: "Biznes uchun obunadagi saytlar",
  },
  showroomLead: {
    ru: "Выберите нишу и стиль — откроется живой сайт-пример. Один тариф: 50 $ в месяц, без процента с заказов.",
    en: "Pick a niche and a style to open a live example. One plan: $50 a month, no commission on orders.",
    uz: "Soha va uslubni tanlang — jonli namuna ochiladi. Bitta tarif: oyiga 50 $, buyurtmalardan foizsiz.",
  },
  open: { ru: "Открыть пример", en: "Open example", uz: "Namunani ochish" },
  soon: { ru: "Скоро", en: "Coming soon", uz: "Tez orada" },
  includes: {
    ru: "Входит: 5–7 страниц, русский и узбекский, заявки в Telegram, правка меню и цен за 2 минуты.",
    en: "Included: 5–7 pages, Russian and Uzbek, requests to Telegram, edit menu and prices in 2 minutes.",
    uz: "Kiradi: 5–7 sahifa, rus va oʻzbek tillari, Telegramga soʻrovlar, menyu va narxlarni 2 daqiqada tahrirlash.",
  },
} satisfies Record<string, L>;

/** Ниши, которые готовятся (показываем честно как «скоро», без ссылок). */
export const upcoming: { id: string; title: L }[] = [
  { id: "clinic", title: { ru: "Клиника и стоматология", en: "Clinic & dentistry", uz: "Klinika va stomatologiya" } },
  { id: "salon", title: { ru: "Салон и барбершоп", en: "Salon & barbershop", uz: "Salon va barbershop" } },
];
