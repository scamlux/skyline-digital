import type { L } from "../types";

/**
 * Данные демо-кофейни «Bodom» (bodom — миндаль). Вымышленный бизнес в Ташкенте:
 * адрес, телефон, цены, отзывы и оценки — демо, чужого бренда нет.
 * Все тексты на трёх языках; узбекский — латиницей, с ʻ (U+02BB).
 */

export type Cat = "coffee" | "notcoffee" | "bakery" | "breakfast" | "dessert";
export const CATS: Cat[] = ["coffee", "notcoffee", "bakery", "breakfast", "dessert"];

/** Группы опций напитка: размер, молоко, сироп. */
export type OptionKind = "size" | "milk" | "syrup";
export const OPTION_KINDS: OptionKind[] = ["size", "milk", "syrup"];

export interface OptionChoice {
  id: string;
  label: L;
  /** Доплата к цене средней порции, сум (может быть отрицательной). */
  delta: number;
  /** Пометка рядом с названием («0» у овсяного — акция). */
  promo?: boolean;
}

export interface OptionGroup {
  title: L;
  /** Выбор по умолчанию (id). */
  def: string;
  choices: OptionChoice[];
}

const same = (s: string): L => ({ ru: s, en: s, uz: s });

export const OPTIONS: Record<OptionKind, OptionGroup> = {
  size: {
    title: { ru: "Размер", en: "Size", uz: "Hajm" },
    def: "m",
    choices: [
      { id: "s", label: same("S"), delta: -4000 },
      { id: "m", label: same("M"), delta: 0 },
      { id: "l", label: same("L"), delta: 5000 },
    ],
  },
  milk: {
    title: { ru: "Молоко", en: "Milk", uz: "Sut" },
    def: "regular",
    choices: [
      { id: "regular", label: { ru: "Обычное", en: "Regular", uz: "Oddiy" }, delta: 0 },
      { id: "oat", label: { ru: "Овсяное", en: "Oat", uz: "Suli" }, delta: 0, promo: true },
      { id: "coconut", label: { ru: "Кокосовое", en: "Coconut", uz: "Kokos" }, delta: 5000 },
    ],
  },
  syrup: {
    title: { ru: "Сироп", en: "Syrup", uz: "Sirop" },
    def: "none",
    choices: [
      { id: "none", label: { ru: "Без", en: "None", uz: "Yoʻq" }, delta: 0 },
      { id: "vanilla", label: { ru: "Ваниль", en: "Vanilla", uz: "Vanil" }, delta: 3000 },
      { id: "caramel", label: { ru: "Карамель", en: "Caramel", uz: "Karamel" }, delta: 3000 },
      { id: "almond", label: { ru: "Миндаль", en: "Almond", uz: "Bodom" }, delta: 3000 },
    ],
  },
};

export type GlyphKind = "cup" | "iced" | "matcha" | "glass" | "croissant" | "cookie" | "plate" | "toast" | "bowl" | "cake" | "brownie";

/**
 * Фото, файлы которых лежат в public/templates/cafe/img. Позиция с фото вне списка показывает
 * нарисованную плитку, а не битую картинку. Когда добавите файл — допишите имя сюда.
 */
export const AVAILABLE_PHOTOS: ReadonlySet<string> = new Set(["flat-white", "cappuccino", "iced-latte", "matcha-latte"]);

export interface MenuItem {
  id: string;
  cat: Cat;
  name: L;
  /** Имя фото в public/templates/cafe/img (<имя>-<240|480|960>.webp). */
  photo?: string;
  /** Нарисованная плитка, если файла фото ещё нет (см. AVAILABLE_PHOTOS). */
  glyph: GlyphKind;
  /** Цена средней порции, сум (демо). */
  price: number;
  options: OptionKind[];
  tag?: "hit" | "new";
  /** Витринная позиция: сколько штук сегодня (правится в кабинете). */
  stock?: number;
}

export const menu: MenuItem[] = [
  { id: "flat-white", cat: "coffee", name: { ru: "Флэт уайт", en: "Flat white", uz: "Flat uayt" }, photo: "flat-white", glyph: "cup", price: 32000, options: ["size", "milk", "syrup"], tag: "hit" },
  { id: "cappuccino", cat: "coffee", name: { ru: "Капучино", en: "Cappuccino", uz: "Kapuchino" }, photo: "cappuccino", glyph: "cup", price: 30000, options: ["size", "milk", "syrup"] },
  { id: "iced-latte", cat: "coffee", name: { ru: "Айс латте", en: "Iced latte", uz: "Ays latte" }, photo: "iced-latte", glyph: "iced", price: 34000, options: ["size", "milk", "syrup"] },
  { id: "raf", cat: "coffee", name: { ru: "Раф", en: "Raf", uz: "Raf" }, photo: "raf", glyph: "cup", price: 38000, options: ["size", "syrup"], tag: "hit" },
  { id: "matcha-latte", cat: "notcoffee", name: { ru: "Матча латте", en: "Matcha latte", uz: "Matcha latte" }, photo: "matcha-latte", glyph: "matcha", price: 36000, options: ["size", "milk"], tag: "new" },
  { id: "lemonade", cat: "notcoffee", name: { ru: "Цитрусовый лимонад", en: "Citrus lemonade", uz: "Sitrus limonad" }, photo: "lemonade", glyph: "glass", price: 28000, options: ["size"] },
  { id: "croissant", cat: "bakery", name: { ru: "Миндальный круассан", en: "Almond croissant", uz: "Bodomli kruassan" }, photo: "croissant", glyph: "croissant", price: 24000, options: [], tag: "hit", stock: 6 },
  { id: "cookie", cat: "bakery", name: { ru: "Печенье с миндалём", en: "Almond cookie", uz: "Bodomli pechenye" }, glyph: "cookie", price: 14000, options: [], stock: 9 },
  { id: "syrniki", cat: "breakfast", name: { ru: "Сырники", en: "Syrniki", uz: "Sirniki" }, photo: "syrniki", glyph: "plate", price: 42000, options: [] },
  { id: "avocado-toast", cat: "breakfast", name: { ru: "Тост с авокадо", en: "Avocado toast", uz: "Avokadoli tost" }, photo: "avocado-toast", glyph: "toast", price: 48000, options: [] },
  { id: "breakfast", cat: "breakfast", name: { ru: "Завтрак Bodom", en: "Bodom breakfast", uz: "Bodom nonushtasi" }, photo: "breakfast", glyph: "plate", price: 58000, options: [] },
  { id: "granola", cat: "breakfast", name: { ru: "Гранола с йогуртом", en: "Granola & yoghurt", uz: "Yogurtli granola" }, photo: "granola", glyph: "bowl", price: 36000, options: [] },
  { id: "cheesecake", cat: "dessert", name: { ru: "Чизкейк", en: "Cheesecake", uz: "Chizkeyk" }, photo: "cheesecake", glyph: "cake", price: 38000, options: [], stock: 3 },
  { id: "brownie", cat: "dessert", name: { ru: "Брауни", en: "Brownie", uz: "Brauni" }, glyph: "brownie", price: 26000, options: [], stock: 5 },
];

export interface Review {
  name: string;
  text: L;
  /** Когда: подпись, не дата. */
  when: L;
}

export interface CafeData {
  name: string;
  tagline: L;
  /** Заголовок и подпись первого экрана — свои для каждого стиля. */
  hero: Record<"a" | "b", { title: L; lead: L }>;
  /** Наклейки на фото: стиль A и B. */
  stickers: Record<"a" | "b", L[]>;
  /** Названия на бегущей строке. */
  marquee: L[];
  address: L;
  phone: { display: string; e164: string };
  telegram: string;
  mapUrl: string;
  hours: { open: string; close: string };
  /** Тихие часы (текст «10–12»). */
  quiet: { from: string; to: string };
  promo: L;
  /** «demo» — подтверждение со ссылкой в Telegram; «telegram» — чат открывается сразу. */
  order: { mode: "demo" | "telegram" };
  reviews: Review[];
  photos: { hero: string; barista: string; interior: string };
}

export const cafeDemo: CafeData = {
  name: "Bodom",
  tagline: {
    ru: "Specialty-кофе и свежая выпечка в Ташкенте",
    en: "Specialty coffee and fresh pastry in Tashkent",
    uz: "Toshkentda specialty kofe va yangi pishiriq",
  },
  hero: {
    a: {
      title: { ru: "Утро с миндальной ноткой", en: "Mornings with an almond note", uz: "Bodom taʼmli tong" },
      lead: { ru: "Заберите кофе по дороге — мы уже варим.", en: "Grab your coffee on the way — we are already brewing.", uz: "Yoʻlda kofengizni oling — biz allaqachon damlayapmiz." },
    },
    b: {
      title: { ru: "Десерты и раф до 22:00", en: "Desserts and raf till 10pm", uz: "22:00 gacha desert va raf" },
      lead: { ru: "Тёплый свет, тёмная обжарка и тихий угол для вас.", en: "Warm light, dark roast and a quiet corner for you.", uz: "Iliq yorugʻlik, qora qovurma va siz uchun sokin burchak." },
    },
  },
  stickers: {
    a: [
      { ru: "свежая обжарка", en: "fresh roast", uz: "yangi qovurma" },
      { ru: "oat milk 0 сум", en: "oat milk 0 UZS", uz: "oat milk 0 soʻm" },
    ],
    b: [
      { ru: "после 18:00 — десерты и раф", en: "after 6 pm — desserts and raf", uz: "18:00 dan keyin — desert va raf" },
      { ru: "тёплый свет", en: "warm light", uz: "iliq yorugʻlik" },
    ],
  },
  marquee: [
    { ru: "флэт уайт", en: "flat white", uz: "flat uayt" },
    { ru: "капучино", en: "cappuccino", uz: "kapuchino" },
    { ru: "айс латте", en: "iced latte", uz: "ays latte" },
    { ru: "раф", en: "raf", uz: "raf" },
    { ru: "матча", en: "matcha", uz: "matcha" },
    { ru: "лимонад", en: "lemonade", uz: "limonad" },
    { ru: "круассан", en: "croissant", uz: "kruassan" },
    { ru: "чизкейк", en: "cheesecake", uz: "chizkeyk" },
  ],
  address: { ru: "Ташкент, ул. Бодомзор, 12 (демо)", en: "Tashkent, Bodomzor st. 12 (demo)", uz: "Toshkent, Bodomzor koʻchasi, 12 (demo)" },
  phone: { display: "+998 71 200-00-12", e164: "+998712000012" },
  telegram: "bodom_demo",
  mapUrl: "#map",
  hours: { open: "08:00", close: "22:00" },
  quiet: { from: "10:00", to: "12:00" },
  promo: {
    ru: "Овсяное молоко сегодня бесплатно",
    en: "Oat milk is free today",
    uz: "Bugun suli suti bepul",
  },
  order: { mode: "demo" },
  reviews: [
    { name: "Алина", text: { ru: "Лучший флэт уайт у метро. Забрала за 3 минуты.", en: "Best flat white near the metro. Picked up in 3 minutes.", uz: "Metro yonidagi eng yaxshi flat uayt. 3 daqiqada oldim." }, when: { ru: "демо-отзыв", en: "demo review", uz: "demo fikr" } },
    { name: "Тимур", text: { ru: "Миндальный круассан — причина приходить каждое утро.", en: "The almond croissant is the reason to come every morning.", uz: "Bodomli kruassan — har tong kelish sababi." }, when: { ru: "демо-отзыв", en: "demo review", uz: "demo fikr" } },
    { name: "Мадина", text: { ru: "Заказала заранее и не стояла в очереди. Удобно.", en: "Ordered ahead and skipped the queue. Handy.", uz: "Oldindan buyurtma berdim, navbat kutmadim. Qulay." }, when: { ru: "демо-отзыв", en: "demo review", uz: "demo fikr" } },
    { name: "Сардор", text: { ru: "Тихо, есть розетки — работаю тут по пятницам.", en: "Quiet, with sockets — I work here on Fridays.", uz: "Sokin, rozetka bor — juma kunlari shu yerda ishlayman." }, when: { ru: "демо-отзыв", en: "demo review", uz: "demo fikr" } },
    { name: "Камола", text: { ru: "Вечером берём чизкейк и раф. Очень уютно.", en: "In the evening we get cheesecake and raf. So cosy.", uz: "Kechqurun chizkeyk va raf olamiz. Juda shinam." }, when: { ru: "демо-отзыв", en: "demo review", uz: "demo fikr" } },
  ],
  photos: { hero: "hero", barista: "barista", interior: "interior" },
};

/** Имя фото позиции, если файл есть; иначе undefined (покажется нарисованная плитка). */
export const photoOf = (item: Pick<MenuItem, "photo">): string | undefined => (item.photo && AVAILABLE_PHOTOS.has(item.photo) ? item.photo : undefined);

/** Демо-позиции по id — для тестов и кабинета. */
export const itemById = (id: string): MenuItem | undefined => menu.find((m) => m.id === id);
