import type { L } from "../types";

/**
 * Демо-данные ресторана. Бизнес, адрес, телефон, цены и тексты — вымышленные:
 * это витрина шаблона, а не чужой бренд. В боевом сайте владелец меняет их в админке.
 */
export type Tag = "spicy" | "veg" | "hit";

export interface MenuItem {
  /** Стабильный ключ блюда: по нему хранятся правки владельца (цена, стоп-лист, фото). */
  id: string;
  name: L;
  desc?: L;
  /** Сум. */
  price: number;
  tags?: Tag[];
  /** false — позиция в стоп-листе: остаётся в меню, но помечена «сегодня нет». */
  available?: boolean;
  /**
   * Необязательное фото блюда: базовое имя файла в public/templates/restaurant/img
   * (лежат -480/-960 .webp). Без фото меню остаётся чисто типографским.
   */
  photo?: string;
}

export interface MenuCategory {
  id: string;
  title: L;
  items: MenuItem[];
}

export interface RestaurantData {
  name: string;
  tagline: L;
  intro: L;
  phone: { e164: string; display: string };
  /** Telegram без @ — на него уходит бронь, если mode = "telegram". */
  telegram: string;
  address: L;
  mapUrl: string;
  hours: { open: string; close: string };
  /** Агрегаторы доставки: кнопки в блоке «Заказать домой». */
  delivery: { name: string; url: string }[];
  /** Ссылки на карточки на картах — отзывы читают там, а не копируются на сайт. */
  reviews: { name: string; url: string }[];
  /** Баннер-акция под шапкой; владелец включает/выключает и меняет текст в кабинете. */
  promo: L;
  /** Фото: hero (первый экран), about (о нас), gallery (3 кадра в «О нас»). Базовые имена файлов. */
  photos: { hero: string; about: string; gallery: string[] };
  menu: MenuCategory[];
  about: { title: L; paragraphs: L[]; facts: { k: L; v: L }[] };
  booking: {
    /** demo — показать подтверждение; telegram — открыть чат владельца с готовым текстом. */
    mode: "demo" | "telegram";
  };
}

export const restaurantDemo: RestaurantData = {
  name: "Dasturxon",
  tagline: {
    ru: "Домашний плов, лагман и самса — каждый день",
    en: "Home-style plov, lagman and samsa — every day",
    uz: "Uyda pishirilgan osh, lagʻmon va somsa — har kuni",
  },
  intro: {
    ru: "Узбекская кухня на казане и на углях. Столик можно занять заранее, а плов — взять с собой.",
    en: "Uzbek cooking over a kazan and coals. Reserve a table ahead, or take the plov to go.",
    uz: "Qozonda va choʻgʻda pishadigan oʻzbek taomlari. Stolni oldindan band qiling yoki oshni olib keting.",
  },
  phone: { e164: "+998900000000", display: "+998 90 000 00 00" },
  telegram: "dasturxon_demo",
  address: {
    ru: "Ташкент, улица Примерная, 12 (демо-адрес)",
    en: "Tashkent, Primernaya street 12 (demo address)",
    uz: "Toshkent, Namunaviy koʻcha, 12 (demo manzil)",
  },
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Tashkent",
  hours: { open: "10:00", close: "23:00" },
  delivery: [
    { name: "Uzum Tezkor", url: "#" },
    { name: "Yandex Eats", url: "#" },
  ],
  reviews: [
    { name: "Google Maps", url: "#" },
    { name: "2GIS", url: "#" },
  ],
  promo: {
    ru: "Бизнес-ланч с 12:00 до 15:00 — плов и чай за 70 000 сум",
    en: "Business lunch 12:00–15:00 — plov and tea for 70,000 UZS",
    uz: "Biznes-lanch 12:00–15:00 — osh va choy 70 000 soʻm",
  },
  photos: { hero: "hero", about: "kazan", gallery: ["interior", "tandir", "table"] },
  menu: [
    {
      id: "hot",
      title: { ru: "Горячее", en: "Mains", uz: "Issiq taomlar" },
      items: [
        {
          id: "plov",
          photo: "plov",
          name: { ru: "Плов праздничный", en: "Festive plov", uz: "Bayramona osh" },
          desc: {
            ru: "Говядина, нут, изюм, айва, чеснок. Варим на казане с утра.",
            en: "Beef, chickpeas, raisins, quince, garlic. Cooked in a kazan since morning.",
            uz: "Mol goʻshti, noʻxat, mayiz, behi, sarimsoq. Ertalabdan qozonda dimlanadi.",
          },
          price: 65000,
          tags: ["hit"],
        },
        {
          id: "lagman",
          photo: "lagman",
          name: { ru: "Лагман жареный", en: "Fried lagman", uz: "Qovurma lagʻmon" },
          desc: {
            ru: "Домашняя лапша, говядина, болгарский перец, зелень.",
            en: "Hand-pulled noodles, beef, bell pepper, herbs.",
            uz: "Uy choʻzma lagʻmoni, mol goʻshti, bolgar qalampiri, koʻkatlar.",
          },
          price: 58000,
          tags: ["spicy"],
        },
        {
          id: "manti",
          photo: "manti",
          name: { ru: "Манты с тыквой", en: "Pumpkin manti", uz: "Qovoqli manti" },
          desc: {
            ru: "Пять штук, на пару, с сметаной.",
            en: "Five pieces, steamed, with sour cream.",
            uz: "Beshta, bugʻda pishirilgan, qaymoq bilan.",
          },
          price: 42000,
          tags: ["veg"],
        },
        {
          id: "naryn",
          photo: "naryn",
          name: { ru: "Нарын", en: "Naryn", uz: "Norin" },
          desc: {
            ru: "Тонкая лапша с конониной по-домашнему.",
            en: "Thin noodles with horse meat, home style.",
            uz: "Ot goʻshti bilan yupqa lagʻmon, uycha.",
          },
          price: 72000,
          available: false,
        },
      ],
    },
    {
      id: "grill",
      title: { ru: "Шашлык", en: "Grill", uz: "Kabob" },
      items: [
        {
          id: "shashlik",
          photo: "shashlik",
          name: { ru: "Шашлык из баранины", en: "Lamb skewer", uz: "Qoʻy goʻshti kabobi" },
          desc: {
            ru: "На углях, с луком и лавашом. Порция — 2 шпажки.",
            en: "Over coals, with onion and flatbread. Two skewers.",
            uz: "Choʻgʻda, piyoz va non bilan. Ikki sixli porsiya.",
          },
          price: 54000,
          tags: ["hit"],
        },
        {
          id: "lula",
          photo: "lula",
          name: { ru: "Люля-кебаб", en: "Lula kebab", uz: "Lyulya-kabob" },
          price: 38000,
          tags: ["spicy"],
        },
        {
          id: "veg-grill",
          photo: "veg-grill",
          name: { ru: "Овощи на углях", en: "Charred vegetables", uz: "Choʻgʻda sabzavotlar" },
          price: 32000,
          tags: ["veg"],
        },
      ],
    },
    {
      id: "starters",
      title: { ru: "Закуски и самса", en: "Starters & samsa", uz: "Gazaklar va somsa" },
      items: [
        {
          id: "samsa",
          photo: "samsa",
          name: { ru: "Самса из тандыра", en: "Tandoor samsa", uz: "Tandir somsa" },
          desc: {
            ru: "С бараниной и луком, горячая из печи.",
            en: "Lamb and onion, hot from the oven.",
            uz: "Qoʻy goʻshti va piyoz bilan, tandirdan issiq.",
          },
          price: 14000,
          tags: ["hit"],
        },
        {
          id: "achichuk",
          photo: "achichuk",
          name: { ru: "Ачичук", en: "Achichuk", uz: "Achchiq-chuchuk" },
          desc: {
            ru: "Помидоры, лук, базилик.",
            en: "Tomato, onion, basil.",
            uz: "Pomidor, piyoz, rayhon.",
          },
          price: 22000,
          tags: ["veg"],
        },
        {
          id: "lepyoshka",
          photo: "lepyoshka",
          name: { ru: "Лепёшка", en: "Flatbread", uz: "Non" },
          price: 8000,
        },
      ],
    },
    {
      id: "drinks",
      title: { ru: "Напитки", en: "Drinks", uz: "Ichimliklar" },
      items: [
        {
          id: "tea",
          photo: "tea",
          name: { ru: "Чай зелёный, чайник", en: "Green tea, pot", uz: "Koʻk choy, choynak" },
          price: 12000,
        },
        {
          id: "ayran",
          photo: "ayran",
          name: { ru: "Айран", en: "Ayran", uz: "Ayron" },
          price: 15000,
        },
        {
          id: "mors",
          photo: "mors",
          name: { ru: "Морс ягодный", en: "Berry mors", uz: "Rezavor mors" },
          price: 18000,
        },
      ],
    },
  ],
  about: {
    title: { ru: "Кухня без спешки", en: "Cooking without hurry", uz: "Shoshilmay pishirilgan taom" },
    paragraphs: [
      {
        ru: "Плов варится на казане с утра, лагман тянется вручную — поэтому первые порции готовы к открытию, а последние заканчиваются, когда заканчиваются.",
        en: "Plov simmers in the kazan from morning and the lagman noodles are pulled by hand — so the first portions are ready at opening, and the last ones go when they go.",
        uz: "Osh ertalabdan qozonda dimlanadi, lagʻmon qoʻlda choʻziladi — shuning uchun birinchi porsiyalar ochilishga tayyor, oxirgilari tugaguncha beriladi.",
      },
      {
        ru: "Если нужного блюда нет, мы пометим его в меню заранее — вы не придёте зря.",
        en: "If a dish is out, we mark it in the menu ahead of time — so you never come for nothing.",
        uz: "Agar taom tugagan boʻlsa, uni menyuda oldindan belgilaymiz — bekorga kelmaysiz.",
      },
    ],
    facts: [
      { k: { ru: "Кухня", en: "Kitchen", uz: "Oshxona" }, v: { ru: "Узбекская", en: "Uzbek", uz: "Oʻzbek" } },
      { k: { ru: "Готовим на", en: "Cooked on", uz: "Pishiriladi" }, v: { ru: "Казан и угли", en: "Kazan and coals", uz: "Qozon va choʻgʻ" } },
      { k: { ru: "С собой", en: "To go", uz: "Olib ketish" }, v: { ru: "Да, плов и шашлык", en: "Yes — plov and grill", uz: "Ha — osh va kabob" } },
    ],
  },
  booking: { mode: "demo" },
};
