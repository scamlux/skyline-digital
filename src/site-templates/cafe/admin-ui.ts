import type { Locale } from "../types";
import type { OrderStatus } from "./store";
import type { L } from "../types";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Слова после числа: склонение по Intl.PluralRules (kit/plural.ts). */
export const adminWords: Record<"orders" | "views" | "stamps" | "cups" | "pcs", Record<Locale, Forms>> = {
  orders: {
    ru: { one: "заказ", few: "заказа", many: "заказов" },
    en: { one: "order", other: "orders" },
    uz: { other: "ta buyurtma" },
  },
  views: {
    ru: { one: "визит", few: "визита", many: "визитов" },
    en: { one: "visit", other: "visits" },
    uz: { other: "tashrif" },
  },
  stamps: {
    ru: { one: "печать", few: "печати", many: "печатей" },
    en: { one: "stamp", other: "stamps" },
    uz: { other: "ta muhr" },
  },
  cups: {
    ru: { one: "чашка", few: "чашки", many: "чашек" },
    en: { one: "cup", other: "cups" },
    uz: { other: "ta piyola" },
  },
  pcs: {
    ru: { one: "шт", few: "шт", many: "шт" },
    en: { one: "pc", other: "pcs" },
    uz: { other: "dona" },
  },
};

const status: Record<OrderStatus, L> = {
  new: { ru: "Новый", en: "New", uz: "Yangi" },
  cooking: { ru: "Готовится", en: "Preparing", uz: "Tayyorlanmoqda" },
  ready: { ru: "Готов", en: "Ready", uz: "Tayyor" },
  done: { ru: "Выдан", en: "Picked up", uz: "Topshirildi" },
  cancelled: { ru: "Отменён", en: "Cancelled", uz: "Bekor qilindi" },
};

/** Тексты кабинета владельца кофейни. Язык без жаргона. */
export const adminUi = {
  openSite: { ru: "Открыть сайт", en: "Open site", uz: "Saytni ochish" },
  langLabel: { ru: "Язык", en: "Language", uz: "Til" },
  tabsLabel: { ru: "Разделы кабинета", en: "Dashboard sections", uz: "Kabinet boʻlimlari" },
  loading: { ru: "Загрузка", en: "Loading", uz: "Yuklanmoqda" },
  tabs: {
    overview: { ru: "Обзор", en: "Overview", uz: "Umumiy" },
    orders: { ru: "Заказы", en: "Orders", uz: "Buyurtmalar" },
    menu: { ru: "Меню и цены", en: "Menu & prices", uz: "Menyu va narxlar" },
    case: { ru: "Витрина", en: "Pastry case", uz: "Vitrina" },
    loyalty: { ru: "Лояльность", en: "Loyalty", uz: "Sodiqlik" },
    promo: { ru: "Акция", en: "Promo", uz: "Aksiya" },
  },
  demo: {
    badge: { ru: "Демо", en: "Demo", uz: "Demo" },
    text: { ru: "Демо-данные хранятся в вашем браузере. Заказы с сайта попадают сюда сразу.", en: "Demo data lives in your browser. Orders from the site land here right away.", uz: "Demo maʼlumotlar brauzeringizda saqlanadi. Saytdagi buyurtmalar shu yerga darhol tushadi." },
    seed: { ru: "Заполнить примерами", en: "Fill with samples", uz: "Namunalar bilan toʻldirish" },
    reset: { ru: "Очистить", en: "Clear", uz: "Tozalash" },
  },
  period: { ru: "За 7 дней", en: "Last 7 days", uz: "7 kun ichida" },
  stats: {
    orders: { ru: "Заказы", en: "Orders", uz: "Buyurtmalar" },
    revenue: { ru: "Выручка", en: "Revenue", uz: "Tushum" },
    avg: { ru: "Средний чек", en: "Average check", uz: "Oʻrtacha chek" },
    views: { ru: "Визиты на сайт", en: "Site visits", uz: "Sayt tashriflari" },
  },
  vsPrev: { ru: "к прошлой неделе", en: "vs previous week", uz: "oʻtgan haftaga nisbatan" },
  topTitle: { ru: "Что берут чаще всего", en: "Top drinks", uz: "Eng koʻp olinadigan ichimliklar" },
  topEmpty: { ru: "Пока нет заказов за неделю.", en: "No orders this week yet.", uz: "Bu hafta hali buyurtma yoʻq." },
  byDay: { ru: "Заказы по дням", en: "Orders by day", uz: "Kunlar boʻyicha buyurtmalar" },
  recent: { ru: "Последние заказы", en: "Latest orders", uz: "Oxirgi buyurtmalar" },
  days: {
    ru: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"],
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    uz: ["du", "se", "ch", "pa", "ju", "sh", "ya"],
  } satisfies Record<Locale, string[]>,
  digest: {
    title: { ru: "Сводка в Telegram", en: "Telegram digest", uz: "Telegramda xulosa" },
    sample: { ru: "Образец формата", en: "Format sample", uz: "Format namunasi" },
    text: {
      ru: "Так будет выглядеть сводка, которую владелец получает в Telegram (образец формата).",
      en: "This is what the digest the owner gets on Telegram will look like (format sample).",
      uz: "Egasi Telegramda oladigan xulosa shunday koʻrinadi (format namunasi).",
    },
    head: { ru: "Итоги недели", en: "Weekly summary", uz: "Hafta yakunlari" },
    line1: { ru: "Заказов: {n}, выручка: {sum}", en: "Orders: {n}, revenue: {sum}", uz: "Buyurtmalar: {n}, tushum: {sum}" },
    line2: { ru: "Средний чек: {sum}", en: "Average check: {sum}", uz: "Oʻrtacha chek: {sum}" },
    line3: { ru: "Хит недели: {drink}", en: "Hit of the week: {drink}", uz: "Hafta xiti: {drink}" },
    noDrink: { ru: "—", en: "—", uz: "—" },
  },
  orders: {
    empty: { ru: "Заказов пока нет — сделайте тестовый на сайте.", en: "No orders yet — place a test one on the site.", uz: "Hozircha buyurtma yoʻq — saytda sinov buyurtma bering." },
    active: { ru: "В работе", en: "In progress", uz: "Jarayonda" },
    finished: { ru: "Завершённые", en: "Finished", uz: "Yakunlangan" },
    noActive: { ru: "Всё выдано, новых нет.", en: "Everything is handed out, nothing new.", uz: "Hammasi topshirilgan, yangisi yoʻq." },
    pickup: { ru: "Заберут", en: "Pickup", uz: "Olib ketadi" },
    fromSite: { ru: "с сайта", en: "from site", uz: "saytdan" },
    free: { ru: "бесплатный кофе", en: "free coffee", uz: "bepul kofe" },
    status,
    toCooking: { ru: "Готовить", en: "Start", uz: "Tayyorlash" },
    toReady: { ru: "Готов", en: "Ready", uz: "Tayyor" },
    toDone: { ru: "Выдан", en: "Picked up", uz: "Topshirildi" },
    cancel: { ru: "Отменить", en: "Cancel", uz: "Bekor qilish" },
    restore: { ru: "Вернуть", en: "Restore", uz: "Qaytarish" },
    today: { ru: "Сегодня", en: "Today", uz: "Bugun" },
    tomorrow: { ru: "Завтра", en: "Tomorrow", uz: "Ertaga" },
  },
  menu: {
    hint: { ru: "Нажмите на цену, чтобы изменить. Правки сразу видны на сайте.", en: "Tap a price to change it. Edits show on the site right away.", uz: "Narxni oʻzgartirish uchun bosing. Oʻzgarishlar saytda darhol koʻrinadi." },
    price: { ru: "Цена", en: "Price", uz: "Narx" },
    saved: { ru: "сохранено", en: "saved", uz: "saqlandi" },
    off: { ru: "Нет сегодня", en: "Not today", uz: "Bugun yoʻq" },
    on: { ru: "Вернуть", en: "Back on", uz: "Qaytarish" },
    hide: { ru: "Скрыть", en: "Hide", uz: "Yashirish" },
    show: { ru: "Показать", en: "Show", uz: "Koʻrsatish" },
    hidden: { ru: "скрыто", en: "hidden", uz: "yashirilgan" },
    offLabel: { ru: "нет сегодня", en: "not today", uz: "bugun yoʻq" },
  },
  case: {
    hint: { ru: "Сколько штук в витрине сегодня. Сайт покажет «осталось N» и «закончилось».", en: "How many are in the case today. The site shows “N left” and “sold out”.", uz: "Bugun vitrinada nechta bor. Sayt «N ta qoldi» va «tugadi» deb koʻrsatadi." },
    count: { ru: "Количество", en: "Count", uz: "Soni" },
    minus: { ru: "Меньше", en: "Fewer", uz: "Kamroq" },
    plus: { ru: "Больше", en: "More", uz: "Koʻproq" },
    soldOut: { ru: "закончилось", en: "sold out", uz: "tugadi" },
  },
  loyalty: {
    hint: { ru: "Карта «6-й кофе бесплатно»: печать за каждый заказ.", en: "The “6th coffee is free” card: one stamp per order.", uz: "«6-kofe bepul» kartasi: har buyurtmaga bitta muhr." },
    issued: { ru: "Печатей выдано", en: "Stamps issued", uz: "Berilgan muhrlar" },
    redeemed: { ru: "Бесплатных кофе выдано", en: "Free coffees redeemed", uz: "Berilgan bepul kofelar" },
    rate: { ru: "Бесплатных на 100 печатей", en: "Free cups per 100 stamps", uz: "100 muhrga bepul kofe" },
    yours: { ru: "Карта посетителя в демо", en: "Demo visitor card", uz: "Demo mehmon kartasi" },
  },
  promo: {
    title: { ru: "Акция на сайте", en: "Promo on the site", uz: "Saytdagi aksiya" },
    on: { ru: "Показывать плашку над меню", en: "Show the banner above the menu", uz: "Menyu ustida lavhani koʻrsatish" },
    text: { ru: "Текст акции", en: "Promo text", uz: "Aksiya matni" },
    hint: { ru: "Текст правится для текущего языка — остальные остаются как были.", en: "The text is edited for the current language — the others stay as they were.", uz: "Matn joriy til uchun tahrirlanadi — qolganlari oʻzgarmaydi." },
  },
} satisfies Record<string, unknown>;
