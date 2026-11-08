import type { L } from "../types";

/**
 * Демо-данные стоматологической клиники. Клиника, адрес, телефон, врачи, отзывы, цифры и цены
 * вымышленные: это витрина шаблона, а не чужой бренд. Цены — реалистичные ориентиры Ташкента
 * (вилка «от–до» в сумах), помечены как демо. В боевом сайте владелец меняет их в кабинете.
 */
export type ServiceIcon =
  | "consult"
  | "clean"
  | "filling"
  | "canals"
  | "implant"
  | "veneers"
  | "whitening"
  | "braces"
  | "refill"
  | "extract"
  | "crown"
  | "kids";

/** Значок плитки «Что беспокоит?» (рисуются в icons.tsx). */
export type SymptomIcon = "pain" | "whiten" | "straight" | "missing" | "kids" | "check";

/** Специализация врача для фильтра: терапевт, ортодонт, хирург, детский приём. */
export type DoctorTag = "therapist" | "ortho" | "surgeon" | "kids";

export interface ClinicService {
  /** Стабильный ключ: по нему хранятся правки владельца (цена, скрытие). */
  id: string;
  icon: ServiceIcon;
  name: L;
  blurb: L;
  /** За что цена: «за зуб», «за процедуру»… */
  unit: L;
  /** Сум, вилка «от–до» за одну единицу. 0–0 — бесплатно. */
  min: number;
  max: number;
  /** Входит ли в калькулятор лечения. */
  calc: boolean;
  /** Сколько единиц можно выбрать в калькуляторе. */
  maxQty: number;
  /** Визитов на первую единицу и на каждую следующую (может быть дробным: 0.5 — два зуба за визит). */
  visitsFirst: number;
  visitsEach: number;
}

export interface ClinicDoctor {
  id: string;
  name: L;
  role: L;
  years: number;
  /** Базовое имя фото в public/templates/clinic/img (лежат -480/-960 .webp). */
  photo: string;
  /** Какие услуги ведёт врач. */
  serviceIds: string[];
  /** Специализации для чипов-фильтров в блоке врачей. */
  tags: DoctorTag[];
  /** Приёмные дни по умолчанию: 0 = понедельник … 5 = суббота (воскресенье клиника закрыта). */
  days: number[];
}

/** Плитка «Что беспокоит?»: одно касание — решение с ценой, визитами и врачом. */
export interface ClinicSymptom {
  id: string;
  icon: SymptomIcon;
  /** 2–3 слова на плитке. */
  label: L;
  /** Что сделаем — одна строка. */
  line: L;
  /** Услуги, из которых складывается вилка цены (от самой дешёвой до самой дорогой). */
  options: string[];
  /** Услуга, с которой открывается запись. */
  bookService: string;
  /** Врач, который этим занимается (ведёт bookService). */
  doctorId: string;
}

/** Готовый пакет: набор услуг с ценой по текущему прайсу. */
export interface ClinicPackage {
  id: string;
  name: L;
  items: { id: string; qty: number }[];
  /** Из чего состоит (2–3 коротких пункта). */
  includes: L[];
  /** Рассрочка на N месяцев (демо): на карточке показываем платёж в месяц. */
  instalmentMonths?: number;
}

export interface ClinicReview {
  name: string;
  service: L;
  text: L;
}

export interface ClinicStat {
  id: string;
  value: number;
  /** Знаков после запятой (4.9 → 1). */
  decimals?: number;
  /** Дописать «+» после числа. */
  plus?: boolean;
  label: L;
}

export interface ClinicData {
  name: string;
  /** Вымышленная клиника: показывается рядом с названием, чтобы не принять за настоящую. */
  tagline: L;
  phone: { e164: string; display: string };
  /** Telegram без @ — на него уходит запись. */
  telegram: string;
  address: L;
  mapUrl: string;
  /** Часы приёма; в закрытые дни недели (0 = пн … 6 = вс) клиника не работает. */
  hours: { open: string; close: string; closedDays: number[] };
  /** Шаг сетки записи, минут. */
  slotMinutes: number;
  promo: L;
  photos: {
    hero: string;
    interior: string;
    cabinet: string;
    smile: string;
    consult: string;
    kids: string;
    scanner: string;
    whitenBefore: string;
    whitenAfter: string;
  };
  services: ClinicService[];
  doctors: ClinicDoctor[];
  symptoms: ClinicSymptom[];
  packages: ClinicPackage[];
  stats: ClinicStat[];
  /** Короткие факты для блока контактов: оплата, языки приёма. */
  facts: { k: L; v: L }[];
  reviews: ClinicReview[];
  faq: { q: L; a: L }[];
  /** «demo» — показать подтверждение и ссылку на Telegram; «telegram» — открыть чат с готовым текстом. */
  booking: { mode: "demo" | "telegram" };
}

export const clinicDemo: ClinicData = {
  name: "Oq Tabassum",
  tagline: {
    ru: "Семейная стоматология в центре Ташкента",
    en: "Family dentistry in central Tashkent",
    uz: "Toshkent markazidagi oilaviy stomatologiya",
  },
  phone: { e164: "+998900000011", display: "+998 90 000 00 11" },
  telegram: "oqtabassum_demo",
  address: {
    ru: "Ташкент, улица Примерная, 7 (демо-адрес)",
    en: "Tashkent, Primernaya street 7 (demo address)",
    uz: "Toshkent, Namunaviy koʻcha, 7 (demo manzil)",
  },
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Tashkent",
  hours: { open: "09:00", close: "19:00", closedDays: [6] },
  slotMinutes: 30,
  promo: {
    ru: "Осмотр и консультация бесплатно — до конца месяца (демо-акция)",
    en: "Free check-up and consultation until the end of the month (demo offer)",
    uz: "Koʻrik va maslahat bepul — oy oxirigacha (demo aksiya)",
  },
  // Имена снимков в public/templates/clinic/img (<имя>-<480|960>.webp). Лицензии стоков:
  // public/templates/STOCK-CREDITS.json. Все кадры демонстрационные: под клиента заменяются.
  photos: {
    hero: "hero",
    interior: "interior",
    cabinet: "cabinet",
    smile: "smile",
    consult: "consult",
    kids: "kids",
    scanner: "scanner",
    whitenBefore: "whiten-before",
    whitenAfter: "whiten-after",
  },
  // Новые услуги дописаны в конец: тесты и сид обращаются к первым по индексу.
  services: [
    {
      id: "consult",
      icon: "consult",
      name: { ru: "Осмотр и консультация", en: "Check-up & consultation", uz: "Koʻrik va maslahat" },
      blurb: {
        ru: "Осмотр, снимок и план лечения с ценой на руки.",
        en: "Examination, an X-ray and a treatment plan with prices.",
        uz: "Koʻrik, rentgen va narxlari bilan davolash rejasi.",
      },
      unit: { ru: "за визит", en: "per visit", uz: "bir tashrif uchun" },
      min: 0,
      max: 0,
      calc: false,
      maxQty: 1,
      visitsFirst: 1,
      visitsEach: 0,
    },
    {
      id: "clean",
      icon: "clean",
      name: { ru: "Профессиональная чистка", en: "Professional cleaning", uz: "Professional tozalash" },
      blurb: {
        ru: "Ультразвук и Air Flow за один визит.",
        en: "Ultrasound and Air Flow in one visit.",
        uz: "Ultratovush va Air Flow bir tashrifda.",
      },
      unit: { ru: "обе челюсти", en: "both jaws", uz: "ikkala jag" },
      min: 250_000,
      max: 450_000,
      calc: true,
      maxQty: 1,
      visitsFirst: 1,
      visitsEach: 0,
    },
    {
      id: "filling",
      icon: "filling",
      name: { ru: "Лечение кариеса", en: "Cavity treatment", uz: "Kariesni davolash" },
      blurb: {
        ru: "Современная анестезия, пломба цвета зуба.",
        en: "Modern anaesthesia, a tooth-coloured filling.",
        uz: "Zamonaviy ogʻriqsizlantirish, tish rangidagi plomba.",
      },
      unit: { ru: "за зуб", en: "per tooth", uz: "bir tish" },
      min: 250_000,
      max: 600_000,
      calc: true,
      maxQty: 32,
      visitsFirst: 1,
      visitsEach: 0.5,
    },
    {
      id: "canals",
      icon: "canals",
      name: { ru: "Лечение каналов", en: "Root canal", uz: "Kanallarni davolash" },
      blurb: {
        ru: "Под микроскопом и без боли: сохраняем зуб.",
        en: "Under a microscope and painless: we save the tooth.",
        uz: "Mikroskop ostida va ogʻriqsiz: tishni saqlab qolamiz.",
      },
      unit: { ru: "за зуб", en: "per tooth", uz: "bir tish" },
      min: 500_000,
      max: 1_200_000,
      calc: true,
      maxQty: 32,
      visitsFirst: 2,
      visitsEach: 1.5,
    },
    {
      id: "implant",
      icon: "implant",
      name: { ru: "Имплант под ключ", en: "Implant, turnkey", uz: "Implant “kalit ostida”" },
      blurb: {
        ru: "Имплант и коронка: не отличить от своего зуба.",
        en: "Implant and crown you can’t tell from your own tooth.",
        uz: "Implant va toj: oʻz tishingizdan farqi bilinmaydi.",
      },
      unit: { ru: "имплант с коронкой", en: "implant with crown", uz: "implant va toj" },
      min: 4_500_000,
      max: 9_000_000,
      calc: true,
      maxQty: 32,
      visitsFirst: 3,
      visitsEach: 1,
    },
    {
      id: "veneers",
      icon: "veneers",
      name: { ru: "Виниры", en: "Veneers", uz: "Vinirlar" },
      blurb: {
        ru: "Тонкие накладки меняют форму и цвет зубов.",
        en: "Thin shells reshape and brighten your teeth.",
        uz: "Yupqa qoplamalar tishning shakli va rangini oʻzgartiradi.",
      },
      unit: { ru: "за зуб", en: "per tooth", uz: "bir tish" },
      min: 1_800_000,
      max: 3_500_000,
      calc: true,
      maxQty: 10,
      visitsFirst: 3,
      visitsEach: 0.5,
    },
    {
      id: "whitening",
      icon: "whitening",
      name: { ru: "Отбеливание", en: "Whitening", uz: "Oqartirish" },
      blurb: {
        ru: "Светлее на несколько тонов за визит.",
        en: "Several shades lighter in one visit.",
        uz: "Bir tashrifda bir necha ton oqroq.",
      },
      unit: { ru: "за процедуру", en: "per session", uz: "bir seans" },
      min: 900_000,
      max: 2_000_000,
      calc: true,
      maxQty: 2,
      visitsFirst: 1,
      visitsEach: 1,
    },
    {
      id: "braces",
      icon: "braces",
      name: { ru: "Брекеты и элайнеры", en: "Braces & aligners", uz: "Breketlar va aynerlar" },
      blurb: {
        ru: "План на 3D-модели покажем до начала.",
        en: "You see the 3D plan before we start.",
        uz: "Rejani boshlashdan oldin 3D modelda koʻrsatamiz.",
      },
      unit: { ru: "за систему", en: "per system", uz: "bir tizim" },
      min: 6_000_000,
      max: 14_000_000,
      calc: true,
      maxQty: 2,
      visitsFirst: 6,
      visitsEach: 0,
    },
    {
      id: "refill",
      icon: "refill",
      name: { ru: "Замена пломбы", en: "Filling replacement", uz: "Plomba almashtirish" },
      blurb: {
        ru: "Обновим старую пломбу, пока не развился кариес.",
        en: "We renew an old filling before decay returns.",
        uz: "Karies qaytishidan oldin eski plombani yangilaymiz.",
      },
      unit: { ru: "за зуб", en: "per tooth", uz: "bir tish" },
      min: 200_000,
      max: 450_000,
      calc: true,
      maxQty: 32,
      visitsFirst: 1,
      visitsEach: 0.5,
    },
    {
      id: "extract",
      icon: "extract",
      name: { ru: "Удаление зуба", en: "Tooth extraction", uz: "Tishni olib tashlash" },
      blurb: {
        ru: "Бережно и под анестезией, с заживлением без осложнений.",
        en: "Gentle, under anaesthesia, with an easy recovery.",
        uz: "Ehtiyotkorona, ogʻriqsizlantirish ostida, asoratsiz tuzalish.",
      },
      unit: { ru: "за зуб", en: "per tooth", uz: "bir tish" },
      min: 150_000,
      max: 700_000,
      calc: true,
      maxQty: 32,
      visitsFirst: 1,
      visitsEach: 0.5,
    },
    {
      id: "crown",
      icon: "crown",
      name: { ru: "Коронка", en: "Crown", uz: "Toj" },
      blurb: {
        ru: "Защитит ослабленный зуб и вернёт ему форму.",
        en: "Protects a weakened tooth and restores its shape.",
        uz: "Zaiflashgan tishni himoya qiladi va shaklini tiklaydi.",
      },
      unit: { ru: "за зуб", en: "per tooth", uz: "bir tish" },
      min: 1_200_000,
      max: 3_000_000,
      calc: true,
      maxQty: 32,
      visitsFirst: 2,
      visitsEach: 1,
    },
    {
      id: "kids",
      icon: "kids",
      name: { ru: "Детский приём", en: "Children’s visit", uz: "Bolalar qabuli" },
      blurb: {
        ru: "Знакомство с креслом и бережное лечение с пяти лет.",
        en: "Getting to know the chair and gentle care from age five.",
        uz: "Kreslo bilan tanishuv va besh yoshdan ehtiyotkor davolash.",
      },
      unit: { ru: "за визит", en: "per visit", uz: "bir tashrif" },
      min: 150_000,
      max: 450_000,
      calc: false,
      maxQty: 4,
      visitsFirst: 1,
      visitsEach: 1,
    },
  ],
  doctors: [
    {
      id: "rakhimova",
      name: { ru: "Азиза Рахимова", en: "Aziza Rakhimova", uz: "Aziza Rahimova" },
      role: { ru: "Терапевт, детский приём", en: "Therapist, children’s care", uz: "Terapevt, bolalar qabuli" },
      years: 14,
      photo: "doctor-1",
      serviceIds: ["consult", "clean", "filling", "refill", "canals", "whitening", "kids"],
      tags: ["therapist", "kids"],
      days: [0, 1, 2, 3, 4, 5],
    },
    {
      id: "karimov",
      name: { ru: "Тимур Каримов", en: "Timur Karimov", uz: "Timur Karimov" },
      role: { ru: "Хирург-имплантолог", en: "Surgeon, implantologist", uz: "Jarroh-implantolog" },
      years: 11,
      photo: "doctor-2",
      serviceIds: ["consult", "extract", "implant", "crown", "veneers"],
      tags: ["surgeon"],
      days: [0, 2, 3, 5],
    },
    {
      id: "yusupova",
      name: { ru: "Малика Юсупова", en: "Malika Yusupova", uz: "Malika Yusupova" },
      role: { ru: "Ортодонт", en: "Orthodontist", uz: "Ortodont" },
      years: 9,
      photo: "doctor-3",
      serviceIds: ["consult", "braces", "veneers", "whitening"],
      tags: ["ortho"],
      days: [1, 3, 4, 5],
    },
  ],
  symptoms: [
    {
      id: "pain",
      icon: "pain",
      label: { ru: "Болит зуб", en: "Tooth hurts", uz: "Tish ogʻriyapti" },
      line: {
        ru: "Найдём причину и снимем боль в тот же день.",
        en: "We find the cause and stop the pain the same day.",
        uz: "Sababini topamiz va ogʻriqni shu kuniyoq bosamiz.",
      },
      options: ["filling", "canals"],
      bookService: "consult",
      doctorId: "rakhimova",
    },
    {
      id: "whiten",
      icon: "whiten",
      label: { ru: "Белые зубы", en: "White teeth", uz: "Oq tishlar" },
      line: { ru: "Светлее на 3–5 тонов за один визит.", en: "3–5 shades lighter in one visit.", uz: "Bir tashrifda 3–5 ton oqroq." },
      options: ["whitening"],
      bookService: "whitening",
      doctorId: "rakhimova",
    },
    {
      id: "straight",
      icon: "straight",
      label: { ru: "Ровные зубы", en: "Straight teeth", uz: "Tekis tishlar" },
      line: {
        ru: "3D-план до начала: брекеты или элайнеры.",
        en: "A 3D plan first: braces or aligners.",
        uz: "Avval 3D reja: breket yoki ayner.",
      },
      options: ["braces", "veneers"],
      bookService: "braces",
      doctorId: "yusupova",
    },
    {
      id: "missing",
      icon: "missing",
      label: { ru: "Нет зуба", en: "Missing tooth", uz: "Tish yoʻq" },
      line: { ru: "Имплант с коронкой под ключ.", en: "An implant with a crown, turnkey.", uz: "Implant va toj “kalit ostida”." },
      options: ["implant"],
      bookService: "implant",
      doctorId: "karimov",
    },
    {
      id: "kids",
      icon: "kids",
      label: { ru: "Ребёнку", en: "For my child", uz: "Bolamga" },
      line: {
        ru: "Знакомство с креслом, без лечения.",
        en: "Meet the chair first, no treatment.",
        uz: "Avval kreslo bilan tanishuv, davolashsiz.",
      },
      options: ["kids"],
      bookService: "kids",
      doctorId: "rakhimova",
    },
    {
      id: "check",
      icon: "check",
      label: { ru: "Просто осмотр", en: "Just a check-up", uz: "Oddiy koʻrik" },
      line: {
        ru: "Осмотр и снимок бесплатно, план с ценой.",
        en: "Free check-up and X-ray, a plan with prices.",
        uz: "Bepul koʻrik va rentgen, narxli reja.",
      },
      options: ["consult", "clean"],
      bookService: "consult",
      doctorId: "rakhimova",
    },
  ],
  packages: [
    {
      id: "checkup",
      name: { ru: "Осмотр + чистка", en: "Check-up + cleaning", uz: "Koʻrik + tozalash" },
      items: [
        { id: "consult", qty: 1 },
        { id: "clean", qty: 1 },
      ],
      includes: [
        { ru: "Осмотр и снимок", en: "Exam and X-ray", uz: "Koʻrik va rentgen" },
        { ru: "Ультразвук + Air Flow", en: "Ultrasound + Air Flow", uz: "Ultratovush + Air Flow" },
      ],
    },
    {
      id: "implant-key",
      name: { ru: "Имплант под ключ", en: "Implant, turnkey", uz: "Implant “kalit ostida”" },
      items: [{ id: "implant", qty: 1 }],
      includes: [
        { ru: "3D-снимок", en: "3D scan", uz: "3D snimok" },
        { ru: "Имплант", en: "Implant", uz: "Implant" },
        { ru: "Коронка", en: "Crown", uz: "Toj" },
      ],
    },
    {
      id: "braces-12",
      name: { ru: "Брекеты в рассрочку", en: "Braces in instalments", uz: "Breketlar boʻlib toʻlashga" },
      items: [{ id: "braces", qty: 1 }],
      includes: [
        { ru: "3D-план", en: "3D plan", uz: "3D reja" },
        { ru: "Система и установка", en: "System and fitting", uz: "Tizim va oʻrnatish" },
        { ru: "Рассрочка 12 мес (демо)", en: "12-month instalments (demo)", uz: "12 oy boʻlib toʻlash (demo)" },
      ],
      instalmentMonths: 12,
    },
  ],
  stats: [
    { id: "years", value: 9, plus: true, label: { ru: "лет работаем", en: "years open", uz: "yildan beri ishlaymiz" } },
    { id: "patients", value: 12_400, plus: true, label: { ru: "пациентов (демо)", en: "patients (demo)", uz: "bemor (demo)" } },
    { id: "doctors", value: 3, label: { ru: "врача", en: "doctors", uz: "shifokor" } },
    { id: "rating", value: 4.9, decimals: 1, label: { ru: "оценка (демо)", en: "rating (demo)", uz: "baho (demo)" } },
  ],
  facts: [
    { k: { ru: "Оплата", en: "Payment", uz: "Toʻlov" }, v: { ru: "Наличные, карта, рассрочка", en: "Cash, card, instalments", uz: "Naqd, karta, boʻlib toʻlash" } },
    { k: { ru: "Приём ведут", en: "We speak", uz: "Qabul tili" }, v: { ru: "Русский, узбекский, English", en: "Russian, Uzbek, English", uz: "Rus, oʻzbek, ingliz" } },
  ],
  reviews: [
    {
      name: "Дилноза",
      service: { ru: "Каналы", en: "Root canal", uz: "Kanal" },
      text: {
        ru: "Боялась пять лет. Без боли, каждый шаг объяснили, цена совпала.",
        en: "Avoided it for five years. Painless, every step explained, the price matched.",
        uz: "Besh yil qoʻrqdim. Ogʻriqsiz, har qadam tushuntirildi, narx mos chiqdi.",
      },
    },
    {
      name: "Jasur",
      service: { ru: "Имплант", en: "Implant", uz: "Implant" },
      text: {
        ru: "Через неделю забыл, какой зуб был проблемным. Напоминания — в Telegram.",
        en: "A week later I forgot which tooth was the problem. Reminders come on Telegram.",
        uz: "Bir haftadan keyin qaysi tish muammoli ekanini unutdim. Eslatmalar Telegramda.",
      },
    },
    {
      name: "Малика",
      service: { ru: "Виниры", en: "Veneers", uz: "Vinirlar" },
      text: {
        ru: "Улыбку показали на 3D-модели заранее. Получилось именно так.",
        en: "They showed my smile on a 3D model first. It turned out exactly so.",
        uz: "Tabassumni avval 3D modelda koʻrsatishdi. Aynan shunday chiqdi.",
      },
    },
    {
      name: "Bobur",
      service: { ru: "Чистка", en: "Cleaning", uz: "Tozalash" },
      text: {
        ru: "Записался ночью через сайт, утром уже сидел в кресле.",
        en: "Booked at night through the site, in the chair the next morning.",
        uz: "Tunda sayt orqali yozildim, ertalab allaqachon kreslodaman.",
      },
    },
  ],
  faq: [
    {
      q: { ru: "Больно ли лечить?", en: "Does it hurt?", uz: "Davolash ogʻriqlimi?" },
      a: {
        ru: "Начинаем, когда вы ничего не чувствуете. Неприятно — подняли руку, остановились.",
        en: "We start when you feel nothing. If it’s uncomfortable, raise a hand and we stop.",
        uz: "Hech narsa sezmaganingizdan keyin boshlaymiz. Noqulay boʻlsa, qoʻl koʻtaring — toʻxtaymiz.",
      },
    },
    {
      q: { ru: "Можно узнать цену заранее?", en: "Can I know the price upfront?", uz: "Narxni oldindan bilsa boʻladimi?" },
      a: {
        ru: "Да: вилка — на сайте, точная сумма — письменно после осмотра.",
        en: "Yes: a range on the site, the exact sum in writing after the check-up.",
        uz: "Ha: oraliq saytda, aniq summa koʻrikdan keyin yozma.",
      },
    },
    {
      q: { ru: "Как подготовиться к визиту?", en: "How do I prepare?", uz: "Tashrifga qanday tayyorlanish kerak?" },
      a: {
        ru: "Никак: почистите зубы и возьмите паспорт. Снимки из другой клиники — тоже.",
        en: "No need: brush and bring your ID, plus X-rays from another clinic if you have them.",
        uz: "Shart emas: tishlarni yuving, pasportni oling. Boshqa klinikadan rentgen boʻlsa, uni ham.",
      },
    },
    {
      q: { ru: "Есть гарантия?", en: "Is there a warranty?", uz: "Kafolat bormi?" },
      a: {
        ru: "Да, на пломбы, коронки, виниры и импланты. Срок — в плане лечения.",
        en: "Yes, on fillings, crowns, veneers and implants. The term is in your plan.",
        uz: "Ha, plomba, toj, vinir va implantlarga. Muddat davolash rejasida.",
      },
    },
    {
      q: { ru: "Принимаете детей?", en: "Do you treat children?", uz: "Bolalarni qabul qilasizmi?" },
      a: {
        ru: "Да, с пяти лет. Первый визит — знакомство без лечения.",
        en: "Yes, from five. The first visit is just getting acquainted.",
        uz: "Ha, besh yoshdan. Birinchi tashrif — davolashsiz tanishuv.",
      },
    },
  ],
  booking: { mode: "demo" },
};
