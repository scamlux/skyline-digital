import type { L, StyleId } from "../types";

/**
 * Демо-данные ресторана. Бизнес, адрес, телефон, цены, отзывы и цифры — вымышленные:
 * это витрина шаблона, а не чужой бренд. В боевом сайте владелец меняет их в кабинете.
 */
export type Tag = "spicy" | "veg" | "hit";

export interface MenuItem {
  /** Стабильный ключ блюда: по нему хранятся правки владельца (цена, стоп-лист, скрытие). */
  id: string;
  name: L;
  desc?: L;
  /** Сум. */
  price: number;
  tags?: Tag[];
  /** false — позиция в стоп-листе: остаётся в меню, но помечена «сегодня нет». */
  available?: boolean;
  /** Базовое имя файла в public/templates/restaurant/img (набор ширин — в media.tsx). */
  photo?: string;
}

export interface MenuCategory {
  id: string;
  title: L;
  items: MenuItem[];
}

/** Набор «на компанию»: одна порция каждого блюда на `per` гостей (округление вверх). */
export interface SetPreset {
  id: string;
  name: L;
  blurb: L;
  photo: string;
  /** Скидка на набор, %. Владелец меняет в кабинете. */
  discount: number;
  items: { id: string; per: number }[];
}

export interface Review {
  name: string;
  when: L;
  text: L;
}

export type DeliveryId = "uzum" | "yandex";

export interface RestaurantData {
  name: string;
  /** Короткая подпись для превью в соцсетях и схемы. */
  tagline: L;
  /** Первый экран по стилям: заголовок до пяти слов и одна строка пояснения. */
  hero: Record<StyleId, { title: L; lead: L }>;
  phone: { e164: string; display: string };
  /** Telegram без @ — на него уходит бронь. */
  telegram: string;
  address: L;
  mapUrl: string;
  hours: { open: string; close: string };
  /** Агрегаторы доставки: плитки в блоке «Заказать домой». */
  delivery: { id: DeliveryId; name: string; url: string }[];
  /** Баннер-акция над меню; владелец включает/выключает и меняет текст в кабинете. */
  promo: L;
  /** Первый экран: у стиля A — казан (с лёгким кеном-бернсом), у B — зал при свечах. */
  photos: { hero: Record<StyleId, string> };
  /** Полоса «цифры вместо абзацев»: фото, число и подпись. */
  facts: { photo: string; value: string; label: L }[];
  menu: MenuCategory[];
  sets: SetPreset[];
  reviews: Review[];
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
  hero: {
    a: {
      title: { ru: "Плов, как дома", en: "Plov, the home way", uz: "Osh, uydagidek" },
      lead: {
        ru: "Казан с утра, тандыр до ночи. Столик — за три касания.",
        en: "Kazan since morning, tandoor till night. A table in three taps.",
        uz: "Ertalabdan qozon, kechgacha tandir. Stol — uch bosishda.",
      },
    },
    b: {
      title: { ru: "Вечер на углях", en: "An evening by the coals", uz: "Choʻgʻ yonida kech" },
      lead: {
        ru: "Огонь, лампы и стол на вечер. Бронь займёт минуту.",
        en: "Fire, lanterns and a table for the evening. Booking takes a minute.",
        uz: "Olov, chiroqlar va kechga stol. Bron bir daqiqa oladi.",
      },
    },
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
    { id: "uzum", name: "Uzum Tezkor", url: "#" },
    { id: "yandex", name: "Yandex Eats", url: "#" },
  ],
  promo: {
    ru: "Бизнес-ланч с 12:00 до 15:00 — плов и чай за 70 000 сум",
    en: "Business lunch 12:00–15:00 — plov and tea for 70,000 UZS",
    uz: "Biznes-lanch 12:00–15:00 — osh va choy 70 000 soʻm",
  },
  photos: { hero: { a: "kazan", b: "hero" } },
  facts: [
    { photo: "tandir", value: "06:00", label: { ru: "тандыр горит", en: "tandoor lit", uz: "tandir yonadi" } },
    { photo: "interior", value: "40", label: { ru: "мест в зале", en: "hall seats", uz: "zalda oʻrin" } },
    { photo: "table", value: "15", label: { ru: "минут до ответа", en: "min to confirm", uz: "daqiqada javob" } },
  ],
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
            ru: "Пять штук, на пару, со сметаной.",
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
            ru: "Тонкая лапша с кониной по-домашнему.",
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
          desc: { ru: "Помидоры, лук, базилик.", en: "Tomato, onion, basil.", uz: "Pomidor, piyoz, rayhon." },
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
        { id: "ayran", photo: "ayran", name: { ru: "Айран", en: "Ayran", uz: "Ayron" }, price: 15000 },
        { id: "mors", photo: "mors", name: { ru: "Морс ягодный", en: "Berry mors", uz: "Rezavor mors" }, price: 18000 },
      ],
    },
  ],
  sets: [
    {
      id: "classic",
      name: { ru: "Классика", en: "Classic", uz: "Klassika" },
      blurb: { ru: "Плов, самса, салат", en: "Plov, samsa, salad", uz: "Osh, somsa, salat" },
      photo: "table",
      discount: 10,
      items: [
        { id: "plov", per: 1 },
        { id: "samsa", per: 2 },
        { id: "achichuk", per: 3 },
        { id: "lepyoshka", per: 2 },
        { id: "tea", per: 3 },
      ],
    },
    {
      id: "grill",
      name: { ru: "Мясной стол", en: "Grill table", uz: "Goʻshtli dasturxon" },
      blurb: { ru: "Шашлык, люля, плов", en: "Skewers, lula, plov", uz: "Kabob, lyulya, osh" },
      photo: "shashlik",
      discount: 10,
      items: [
        { id: "shashlik", per: 2 },
        { id: "lula", per: 2 },
        { id: "plov", per: 2 },
        { id: "achichuk", per: 3 },
        { id: "lepyoshka", per: 2 },
        { id: "tea", per: 3 },
      ],
    },
    {
      id: "light",
      name: { ru: "Без мяса", en: "Meat-free", uz: "Goʻshtsiz" },
      blurb: { ru: "Овощи, манты, морс", en: "Veg, manti, mors", uz: "Sabzavot, manti, mors" },
      photo: "veg-grill",
      discount: 10,
      items: [
        { id: "veg-grill", per: 2 },
        { id: "manti", per: 2 },
        { id: "achichuk", per: 2 },
        { id: "lepyoshka", per: 2 },
        { id: "mors", per: 2 },
        { id: "tea", per: 3 },
      ],
    },
  ],
  reviews: [
    {
      name: "Дилноза",
      when: { ru: "Неделю назад", en: "A week ago", uz: "Bir hafta oldin" },
      text: { ru: "Плов как у мамы. Брони хватило одной минуты.", en: "Plov like mom’s. Booking took a minute.", uz: "Osh onamnikidek. Bron bir daqiqa oldi." },
    },
    {
      name: "Jasur",
      when: { ru: "Две недели назад", en: "Two weeks ago", uz: "Ikki hafta oldin" },
      text: { ru: "Праздновали день рождения на тапчане — все в восторге.", en: "Birthday on the tapchan — everyone loved it.", uz: "Tugʻilgan kunni tapchanda nishonladik — hamma xursand." },
    },
    {
      name: "Малика",
      when: { ru: "Месяц назад", en: "A month ago", uz: "Bir oy oldin" },
      text: { ru: "Самса горячая, подтвердили стол за десять минут.", en: "Hot samsa, the table was confirmed in ten minutes.", uz: "Somsa issiq, stolni oʻn daqiqada tasdiqlashdi." },
    },
    {
      name: "Bobur",
      when: { ru: "Месяц назад", en: "A month ago", uz: "Bir oy oldin" },
      text: { ru: "Деловой обед без суеты: тихо и вкусно.", en: "A business lunch without fuss: quiet and tasty.", uz: "Shoshilmasdan biznes tushlik: tinch va mazali." },
    },
  ],
  booking: { mode: "demo" },
};
