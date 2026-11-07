import type { ReactElement } from "react";
import type { L, Locale, StyleId } from "./types";
import { RestaurantSite } from "./restaurant/Restaurant";
import { RestaurantAdmin } from "./restaurant/Admin";
import { restaurantDemo } from "./restaurant/data";
import { ClinicSite } from "./clinic/Clinic";
import { ClinicAdmin } from "./clinic/Admin";
import { clinicDemo } from "./clinic/data";
import { SalonSite } from "./salon/Salon";
import { SalonAdmin } from "./salon/Admin";
import { salonDemo } from "./salon/data";

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
  {
    id: "clinic",
    demoName: clinicDemo.name,
    og: { image: "/templates/clinic/img/og-1200.jpg", description: clinicDemo.tagline },
    title: { ru: "Клиника и стоматология", en: "Clinic & dentistry", uz: "Klinika va stomatologiya" },
    blurb: {
      ru: "Запись к врачу по слотам, калькулятор лечения с вилкой цен, врачи и отзывы.",
      en: "Slot-based booking, a treatment calculator with price ranges, doctors and reviews.",
      uz: "Vaqt boʻyicha yozilish, narx oraligʻi bilan davolash kalkulyatori, shifokorlar va fikrlar.",
    },
    styles: [
      {
        id: "a",
        name: { ru: "Свет", en: "Light", uz: "Yorugʻlik" },
        mood: {
          ru: "Воздух, мята и персик, живая аврора за заголовком. Светло и доверительно.",
          en: "Airy mint and peach with a living aurora behind the headline. Bright and reassuring.",
          uz: "Havodor yalpiz va shaftoli ranglari, sarlavha ortida jonli shafaq. Yorugʻ va ishonchli.",
        },
      },
      {
        id: "b",
        name: { ru: "Глубина", en: "Depth", uz: "Chuqurlik" },
        mood: {
          ru: "Тёмный navy, бирюзовое свечение, свет следует за курсором. Технологично и дорого.",
          en: "Deep navy, teal glow and a spotlight that follows the cursor. High-tech and premium.",
          uz: "Toʻq navy, firuza yorugʻlik va kursor ortidan yuradigan nur. Zamonaviy va nufuzli.",
        },
      },
    ],
    render: (p) => <ClinicSite data={clinicDemo} {...p} />,
    renderAdmin: (p) => <ClinicAdmin data={clinicDemo} {...p} />,
  },
  {
    id: "salon",
    demoName: salonDemo.name,
    og: { image: "/templates/salon/img/og-1200.jpg", description: salonDemo.tagline },
    title: { ru: "Салон и барбершоп", en: "Salon & barbershop", uz: "Salon va barbershop" },
    blurb: {
      ru: "Живой лукбук, подбор образа за три вопроса, запись к мастеру с суммой и временем набора услуг.",
      en: "A live lookbook, a three-question look finder, booking with a master and a live total for combined services.",
      uz: "Jonli lukbuk, uchta savolda obraz tanlash, usta oldiga yozilish va xizmatlar jami summasi hamda vaqti.",
    },
    styles: [
      {
        id: "a",
        name: { ru: "Ночь", en: "Night", uz: "Tun" },
        mood: {
          ru: "Почти чёрный, латунь, зерно плёнки и огромный заголовок поверх фото. Барбершоп.",
          en: "Near-black with brass, film grain and a huge headline over the photo. A barbershop.",
          uz: "Deyarli qora, guruch rang, plyonka donalari va rasm ustida ulkan sarlavha. Barbershop.",
        },
      },
      {
        id: "b",
        name: { ru: "Пудра", en: "Powder", uz: "Pudra" },
        mood: {
          ru: "Сливочный и розовый, антиква и мягкие органичные формы. Салон красоты.",
          en: "Cream and blush, a serif face and soft organic shapes. A beauty salon.",
          uz: "Qaymoq va pushti ranglar, antiqua va yumshoq organik shakllar. Goʻzallik saloni.",
        },
      },
    ],
    render: (p) => <SalonSite data={salonDemo} {...p} />,
    renderAdmin: (p) => <SalonAdmin data={salonDemo} {...p} />,
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
