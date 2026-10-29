import type { ReactElement } from "react";
import type { L, Locale, StyleId } from "./types";
import { RestaurantSite } from "./restaurant/Restaurant";
import { RestaurantAdmin } from "./restaurant/Admin";
import { restaurantDemo } from "./restaurant/data";

export interface TemplateStyle {
  id: StyleId;
  name: L;
  mood: L;
}

export interface TemplateDef {
  id: string;
  title: L;
  blurb: L;
  styles: TemplateStyle[];
  /** Имя вымышленного бизнеса в демо — для заголовка страницы. */
  demoName: string;
  /** Превью для соцсетей (Telegram/WhatsApp): JPG, а не WebP — WebP там показывается плохо. */
  og: { image: string; description: L };
  render: (p: { locale: Locale; style: StyleId; localeHrefs: Record<Locale, string> }) => ReactElement;
  /** Демо-кабинет владельца (если у шаблона он есть). */
  renderAdmin?: (p: { locale: Locale; localeHrefs: Record<Locale, string>; siteHref: string }) => ReactElement;
}

/**
 * Реестр шаблонов. Новая ниша = папка в src/templates/<ниша>/ + запись здесь:
 * витрина /sites и маршруты /sites/<ниша>/<стиль> подхватят её сами.
 */
export const TEMPLATES: TemplateDef[] = [
  {
    id: "restaurant",
    demoName: restaurantDemo.name,
    og: { image: "/templates/restaurant/img/og-1200.jpg", description: restaurantDemo.tagline },
    title: { ru: "Ресторан и кафе", en: "Restaurant & café", uz: "Restoran va kafe" },
    blurb: {
      ru: "Меню как печатная карточка, бронь стола в Telegram, кнопки доставки.",
      en: "A menu like a printed card, table booking on Telegram, delivery buttons.",
      uz: "Bosma kartochkadek menyu, Telegramda stol bandi, yetkazib berish tugmalari.",
    },
    styles: [
      {
        id: "a",
        name: { ru: "Тёплая трапеза", en: "Warm table", uz: "Issiq dasturxon" },
        mood: {
          ru: "Керамическая бирюза, шафран, антиква. Уютно и по-домашнему.",
          en: "Ceramic teal, saffron, a serif. Cosy and homely.",
          uz: "Keramik firuza, zaʼfaron, antiqua. Qulay va uyday.",
        },
      },
      {
        id: "b",
        name: { ru: "Чистый вечер", en: "Clean evening", uz: "Sokin kech" },
        mood: {
          ru: "Графит и латунь, строгая типографика. Вечерний сервис.",
          en: "Graphite and brass, strict typography. Evening service.",
          uz: "Grafit va guruch, qatʼiy tipografika. Kechki xizmat.",
        },
      },
    ],
    render: (p) => <RestaurantSite data={restaurantDemo} {...p} />,
    renderAdmin: (p) => <RestaurantAdmin data={restaurantDemo} {...p} />,
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
