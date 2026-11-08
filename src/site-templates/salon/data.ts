import type { L, StyleId } from "../types";
import { menData } from "./data-men";
import { womenData } from "./data-women";
import { withAvailablePhotos } from "./photos";

/**
 * Типы данных шаблона «Салон». Это ДВА разных бизнеса на одной разметке:
 * стиль A — мужской барбершоп «USTARA Barbershop», стиль B — салон красоты «Nafis Beauty».
 * Названия, цены, мастера, лукбук и подбор образа у каждого свои (data-men.ts, data-women.ts).
 * Всё вымышленное: это витрина шаблона, цены — ориентиры Ташкента в сумах и помечены как демо.
 */

/** Идентификаторы иконок (icons.tsx). */
export type IconId =
  | "scissors" | "fade" | "beard" | "razor" | "kid" | "comb" | "drop" | "crown" | "hair" | "balayage" | "care"
  | "nail" | "gel" | "brow" | "lash" | "brush" | "bride" | "coffee" | "whisky" | "tea" | "lock" | "clock"
  | "phone" | "telegram" | "pin" | "check" | "close" | "arrow" | "chevron" | "spark" | "user" | "calendar";

export interface SalonGroup {
  id: string;
  name: L;
  icon: IconId;
}

export interface SalonService {
  /** Стабильный ключ: по нему хранятся правки владельца (цена, длительность, скрытие). */
  id: string;
  group: string;
  name: L;
  icon: IconId;
  /** Длительность по умолчанию, минут. */
  minutes: number;
  /** Цена по умолчанию, сум. */
  price: number;
  /** Короткая пометка-чип («4 визита»), без предложений. */
  note?: L;
}

/** Пакет: набор услуг со скидкой. Применяется сам, когда в записи есть все его услуги. */
export interface SalonPackage {
  id: string;
  name: L;
  icon: IconId;
  serviceIds: string[];
  /** Скидка по умолчанию, %. Владелец меняет её в кабинете. */
  pct: number;
}

export interface SalonMaster {
  id: string;
  name: L;
  role: L;
  years: number;
  /** Базовое имя фото в public/templates/salon/img (лежат -480/-960 .webp). */
  photo: string;
  /** Какие услуги ведёт мастер. */
  serviceIds: string[];
  /** Рабочие дни по умолчанию: 0 = понедельник … 6 = воскресенье. */
  days: number[];
  /** Фото ещё может не лежать в public: мастер показывается, только когда photos.ts подтвердил файл. */
  optional?: boolean;
}

export interface SalonLook {
  id: string;
  /** Базовое имя фото работы (лежат -240/-480/-960 .webp). */
  photo: string;
  title: L;
  alt: L;
  /** Идентификаторы фильтров лукбука. */
  tags: string[];
  /** Услуги, которые подставятся в запись по кнопке «Записаться». */
  serviceIds: string[];
  /** Мастер, который делает такой образ лучше всего. */
  masterId: string;
  /** Фото ещё может не лежать в public: работа показывается, только когда photos.ts подтвердил файл. */
  optional?: boolean;
}

export interface SalonFilter {
  id: string;
  name: L;
}

export interface QuizOption {
  id: string;
  label: L;
  /** Образ лукбука, чьё фото показываем на плитке ответа. */
  lookId?: string;
  icon?: IconId;
}

export interface SalonQuiz {
  /** Ровно два вопроса: три касания до результата (два ответа + «Записаться»). */
  questions: [{ title: L; options: QuizOption[] }, { title: L; options: QuizOption[] }];
  /** Ключ — «<ответ1>.<ответ2>». */
  results: Record<string, { lookId: string; serviceIds: string[] }>;
}

export interface SalonPerk {
  id: string;
  name: L;
  icon: IconId;
}

export interface SalonReview {
  name: string;
  service: L;
  text: L;
}

/** Заголовок (≤ 5 слов) и одна короткая строка (≤ 90 знаков) секции. */
export interface SectionCopy {
  title: L;
  line: L;
}

export interface PlacePhoto {
  base: string;
  widths: (480 | 960 | 1600)[];
  w: number;
  h: number;
  ratio: "wide" | "square";
  /** Лучшее фото на замену, когда photos.ts подтвердил его файлы. */
  upgrade?: { base: string; widths: (480 | 960 | 1600)[]; w: number; h: number };
}

export interface SalonData {
  /** Идентификатор бизнеса: совпадает со стилем сайта. */
  style: StyleId;
  name: string;
  brand: { main: string; sub: string };
  /** Для JSON-LD. */
  kind: "BarberShop" | "BeautySalon";
  tagline: L;
  hero: { line1: L; line2: L; line: L; photo: { base: string; widths: (480 | 640 | 960 | 1280)[]; w: number; h: number } };
  phone: { e164: string; display: string };
  /** Telegram без @ — на него уходит запись. */
  telegram: string;
  address: L;
  mapUrl: string;
  hours: { open: string; close: string };
  /** Шаг сетки записи, минут. */
  slotMinutes: number;
  promo: L;
  groups: SalonGroup[];
  services: SalonService[];
  packages: SalonPackage[];
  masters: SalonMaster[];
  looks: SalonLook[];
  filters: SalonFilter[];
  quiz: SalonQuiz;
  perks: SalonPerk[];
  /** Набор услуг для демо-записей в кабинете. */
  seedBaskets: string[][];
  copy: { looks: SectionCopy; services: SectionCopy; quiz: SectionCopy; masters: SectionCopy; place: SectionCopy; reviews: SectionCopy; faq: SectionCopy; contacts: SectionCopy; cta: SectionCopy };
  /** Секция «Клуб» (A) / «Салон» (B): фото и три чипа вместо абзацев. */
  place: { photo: PlacePhoto; alt: L; chips: { icon: IconId; label: L }[] };
  reviews: SalonReview[];
  faq: { q: L; a: L }[];
  /** «demo» — подтверждение и кнопка со ссылкой на Telegram; «telegram» — открыть чат сразу. */
  booking: { mode: "demo" | "telegram" };
}

/** Два бизнеса витрины: A — барбершоп, B — салон красоты. Необязательные фото учтены (photos.ts). */
export const salonBusinesses: Record<StyleId, SalonData> = { a: withAvailablePhotos(menData), b: withAvailablePhotos(womenData) };

/** Для заголовка страницы и превью в мессенджерах. */
export const salonDemo: SalonData = salonBusinesses.a;

export const businessOf = (style: StyleId): SalonData => salonBusinesses[style];
