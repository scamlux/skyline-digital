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
import { salonBusinesses, salonDemo } from "./salon/data";
import { CafeSite } from "./cafe/Cafe";
import { CafeAdmin } from "./cafe/Admin";
import { cafeDemo } from "./cafe/data";

export interface TemplateStyle {
  id: StyleId;
  name: L;
  mood: L;
  /** Короткая подпись кнопки стиля в панели демо вместо буквы A/B (например «Мужской» / «Женский»). */
  label?: L;
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
      ru: "Плитки «Что беспокоит?», карта зубов с живой ценой, запись к врачу в три шага.",
      en: "“What’s bothering you?” tiles, a tooth map with a live price, booking in three steps.",
      uz: "«Nima bezovta qilyapti?» plitkalari, jonli narxli tishlar xaritasi, uch bosqichda yozilish.",
    },
    styles: [
      {
        id: "a",
        name: { ru: "Белый кабинет", en: "White surgery", uz: "Oq kabinet" },
        label: { ru: "Белый", en: "White", uz: "Oq" },
        mood: {
          ru: "Бумажно-белый и кобальт, крупные цифры, тонкая сетка и риски как на приборе. Точно и спокойно.",
          en: "Paper white and cobalt, big numerals, a hairline grid and tick marks like an instrument. Precise and calm.",
          uz: "Qogʻoz oqligi va kobalt, yirik raqamlar, ingichka toʻr va asbobdagidek chiziqchalar. Aniq va sokin.",
        },
      },
      {
        id: "b",
        name: { ru: "Ночная смена", en: "Night shift", uz: "Tungi smena" },
        label: { ru: "Ночной", en: "Night", uz: "Tungi" },
        mood: {
          ru: "Графит и ink-blue, холодное свечение, челюсть как в окне 3D-сканера. Технологично и дорого.",
          en: "Graphite and ink-blue, a cold glow, the jaw as in a 3D-scanner window. High-tech and premium.",
          uz: "Grafit va ink-blue, sovuq yorugʻlik, jag 3D-skaner oynasidagidek. Zamonaviy va nufuzli.",
        },
      },
    ],
    render: (p) => <ClinicSite data={clinicDemo} {...p} />,
    renderAdmin: (p) => <ClinicAdmin data={clinicDemo} {...p} />,
  },
  {
    id: "salon",
    demoName: `${salonBusinesses.a.name} · ${salonBusinesses.b.name}`,
    og: { image: "/templates/salon/img/og-1200.jpg", description: salonDemo.tagline },
    title: { ru: "Салон и барбершоп", en: "Salon & barbershop", uz: "Salon va barbershop" },
    blurb: {
      ru: "Два сайта: барбершоп для мужчин и салон красоты. Образы, пакеты, запись в три шага.",
      en: "Two sites: a barbershop for men and a beauty salon. Looks, bundles, booking in three steps.",
      uz: "Ikki sayt: erkaklar barbershopi va goʻzallik saloni. Obrazlar, paketlar, uch bosqichda yozilish.",
    },
    styles: [
      {
        id: "a",
        name: { ru: "Мужской", en: "Men’s", uz: "Erkaklar" },
        label: { ru: "Муж", en: "Men", uz: "Erkak" },
        mood: {
          ru: "USTARA: почти чёрный, латунь, жёсткие грани. Закрытый барбершоп для мужчин.",
          en: "USTARA: near-black, brass, hard edges. A private barbershop for men.",
          uz: "USTARA: deyarli qora, guruch, keskin chegaralar. Erkaklar uchun yopiq barbershop.",
        },
      },
      {
        id: "b",
        name: { ru: "Женский", en: "Women’s", uz: "Ayollar" },
        label: { ru: "Жен", en: "Women", uz: "Ayol" },
        mood: {
          ru: "Nafis Beauty: сливочный и винный, антиква, мягкие формы. Салон красоты для неё.",
          en: "Nafis Beauty: cream and wine, a serif face, soft shapes. A beauty salon for her.",
          uz: "Nafis Beauty: qaymoq va sharob rangi, antiqua, yumshoq shakllar. Ayollar goʻzallik saloni.",
        },
      },
    ],
    render: (p) => <SalonSite data={salonBusinesses[p.style]} {...p} />,
    renderAdmin: (p) => <SalonAdmin businesses={salonBusinesses} {...p} />,
  },
  {
    id: "cafe",
    demoName: cafeDemo.name,
    // TODO: когда появится og-1200.jpg (JPG лучше для Telegram/WhatsApp), заменить на него.
    og: { image: "/templates/cafe/img/hero-1280.webp", description: cafeDemo.tagline },
    title: { ru: "Кафе и кофейня", en: "Café & coffee shop", uz: "Kafe va kofexona" },
    blurb: {
      ru: "Меню с фото, заказ навынос к нужному времени, карта «6-й кофе бесплатно».",
      en: "A photo menu, order-ahead pickup at your time, a “6th coffee is free” card.",
      uz: "Rasmli menyu, belgilangan vaqtga olib ketish, «6-kofe bepul» kartasi.",
    },
    styles: [
      {
        id: "a",
        name: { ru: "Утро", en: "Morning", uz: "Tong" },
        mood: {
          ru: "Сливочный и терракота, миндаль и шалфей, круглые шрифты и наклейки. Тёплое утро.",
          en: "Cream and terracotta, almond and sage, round type and stickers. A warm morning.",
          uz: "Qaymoq va terrakota, bodom va yashil ranglar, yumaloq shrift va yorliqlar. Iliq tong.",
        },
      },
      {
        id: "b",
        name: { ru: "Вечер", en: "Evening", uz: "Kech" },
        mood: {
          ru: "Тёмный эспрессо, янтарное свечение, десерты и раф после шести. Вечерний уют.",
          en: "Dark espresso, amber glow, desserts and raf after six. An evening hideout.",
          uz: "Toʻq espresso, qahrabo nuri, oltidan keyin desert va raf. Kechki shinamlik.",
        },
      },
    ],
    render: (p) => <CafeSite data={cafeDemo} {...p} />,
    renderAdmin: (p) => <CafeAdmin data={cafeDemo} {...p} />,
  },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
