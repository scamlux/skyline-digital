import type { L } from "../types";

/**
 * Демо-данные стоматологической клиники. Клиника, адрес, телефон, врачи, отзывы, цифры и цены
 * вымышленные: это витрина шаблона, а не чужой бренд. Цены — реалистичные ориентиры Ташкента
 * (вилка «от–до» в сумах), помечены как демо. В боевом сайте владелец меняет их в кабинете.
 */
export type ServiceIcon = "consult" | "clean" | "filling" | "canals" | "implant" | "veneers" | "whitening" | "braces";

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
  /** Приёмные дни по умолчанию: 0 = понедельник … 5 = суббота (воскресенье клиника закрыта). */
  days: number[];
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
  intro: L;
  hero: { lead: L; words: L[] };
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
  photos: { hero: string; interior: string; cabinet: string; smile: string };
  services: ClinicService[];
  doctors: ClinicDoctor[];
  stats: ClinicStat[];
  trust: L[];
  about: { title: L; paragraphs: L[]; facts: { k: L; v: L }[] };
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
  intro: {
    ru: "Лечим, ставим импланты и выравниваем зубы — взрослым и детям. Цену называем до начала лечения, а записаться можно за минуту.",
    en: "We treat, place implants and straighten teeth, for adults and children. You get the price before treatment starts and can book in a minute.",
    uz: "Davolaymiz, implant oʻrnatamiz va tishlarni tekislaymiz — kattalar ham, bolalar ham. Narxni davolanishdan oldin aytamiz, yozilish esa bir daqiqa.",
  },
  hero: {
    lead: { ru: "Улыбка без", en: "A smile without", uz: "Tabassum" },
    words: [
      { ru: "боли", en: "pain", uz: "ogʻriqsiz" },
      { ru: "страха", en: "fear", uz: "qoʻrquvsiz" },
      { ru: "очередей", en: "queues", uz: "navbatsiz" },
      { ru: "сюрпризов", en: "surprises", uz: "aldovsiz" },
    ],
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
  photos: { hero: "hero", interior: "interior", cabinet: "cabinet", smile: "smile" },
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
        ru: "Ультразвук и Air Flow: убираем налёт и камень за один визит.",
        en: "Ultrasound and Air Flow: plaque and tartar gone in one visit.",
        uz: "Ultratovush va Air Flow: karash va toshni bir tashrifda olib tashlaymiz.",
      },
      unit: { ru: "за обе челюсти", en: "both jaws", uz: "ikkala jag uchun" },
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
      name: { ru: "Лечение кариеса и пломба", en: "Cavity treatment & filling", uz: "Kariesni davolash va plomba" },
      blurb: {
        ru: "Лечим под современной анестезией, пломба цвета вашего зуба.",
        en: "Modern anaesthesia, a filling that matches your tooth colour.",
        uz: "Zamonaviy ogʻriqsizlantirish, tishingiz rangidagi plomba.",
      },
      unit: { ru: "за зуб", en: "per tooth", uz: "bir tish uchun" },
      min: 250_000,
      max: 600_000,
      calc: true,
      maxQty: 8,
      visitsFirst: 1,
      visitsEach: 0.5,
    },
    {
      id: "canals",
      icon: "canals",
      name: { ru: "Лечение каналов", en: "Root canal treatment", uz: "Kanallarni davolash" },
      blurb: {
        ru: "Под микроскопом и без боли: сохраняем зуб, который хотели удалить.",
        en: "Under a microscope and painless: we save the tooth others would pull.",
        uz: "Mikroskop ostida va ogʻriqsiz: olib tashlanishi kerak boʻlgan tishni saqlab qolamiz.",
      },
      unit: { ru: "за зуб", en: "per tooth", uz: "bir tish uchun" },
      min: 500_000,
      max: 1_200_000,
      calc: true,
      maxQty: 6,
      visitsFirst: 2,
      visitsEach: 1.5,
    },
    {
      id: "implant",
      icon: "implant",
      name: { ru: "Имплантация зуба", en: "Dental implant", uz: "Tish implantatsiyasi" },
      blurb: {
        ru: "Имплант и коронка «под ключ»: возвращаем зуб, который не отличить от своего.",
        en: "Implant and crown, turnkey: a tooth you can’t tell from your own.",
        uz: "Implant va tojni “kalit ostida” oʻrnatamiz: oʻz tishingizdan farqi bilinmaydi.",
      },
      unit: { ru: "за имплант с коронкой", en: "per implant with crown", uz: "implant va toj uchun" },
      min: 4_500_000,
      max: 9_000_000,
      calc: true,
      maxQty: 4,
      visitsFirst: 3,
      visitsEach: 1,
    },
    {
      id: "veneers",
      icon: "veneers",
      name: { ru: "Виниры", en: "Veneers", uz: "Vinirlar" },
      blurb: {
        ru: "Тонкие накладки меняют форму и цвет зубов — улыбка как с обложки.",
        en: "Thin shells reshape and brighten your teeth — a cover-worthy smile.",
        uz: "Yupqa qoplamalar tishlarning shakli va rangini oʻzgartiradi — muqovadagidek tabassum.",
      },
      unit: { ru: "за зуб", en: "per tooth", uz: "bir tish uchun" },
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
        ru: "Светлее на несколько тонов за один визит, без чувствительности.",
        en: "Several shades lighter in one visit, without sensitivity.",
        uz: "Bir tashrifda bir necha ton oqroq, sezgirliksiz.",
      },
      unit: { ru: "за процедуру", en: "per session", uz: "bir seans uchun" },
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
        ru: "Выровняем зубы и прикус. План на 3D-модели покажем до начала.",
        en: "We straighten teeth and bite. You see the 3D plan before we start.",
        uz: "Tish va tishlamani tekislaymiz. Rejani boshlashdan oldin 3D modelda koʻrsatamiz.",
      },
      unit: { ru: "за систему", en: "per system", uz: "bir tizim uchun" },
      min: 6_000_000,
      max: 14_000_000,
      calc: true,
      maxQty: 2,
      visitsFirst: 6,
      visitsEach: 0,
    },
  ],
  doctors: [
    {
      id: "rakhimova",
      name: { ru: "Азиза Рахимова", en: "Aziza Rakhimova", uz: "Aziza Rahimova" },
      role: { ru: "Терапевт-эндодонтист", en: "Therapist, endodontist", uz: "Terapevt-endodontist" },
      years: 14,
      photo: "doctor-1",
      serviceIds: ["consult", "clean", "filling", "canals", "whitening"],
      days: [0, 1, 2, 3, 4, 5],
    },
    {
      id: "karimov",
      name: { ru: "Тимур Каримов", en: "Timur Karimov", uz: "Timur Karimov" },
      role: { ru: "Хирург-имплантолог", en: "Surgeon, implantologist", uz: "Jarroh-implantolog" },
      years: 11,
      photo: "doctor-2",
      serviceIds: ["consult", "implant", "veneers"],
      days: [0, 2, 3, 5],
    },
    {
      id: "yusupova",
      name: { ru: "Малика Юсупова", en: "Malika Yusupova", uz: "Malika Yusupova" },
      role: { ru: "Ортодонт, эстетика улыбки", en: "Orthodontist, smile aesthetics", uz: "Ortodont, tabassum estetikasi" },
      years: 9,
      photo: "doctor-3",
      serviceIds: ["consult", "braces", "veneers", "whitening"],
      days: [1, 3, 4, 5],
    },
  ],
  stats: [
    { id: "years", value: 9, plus: true, label: { ru: "лет работаем", en: "years open", uz: "yildan beri ishlaymiz" } },
    { id: "patients", value: 12_400, plus: true, label: { ru: "пациентов", en: "patients", uz: "bemor" } },
    { id: "doctors", value: 3, label: { ru: "врача-специалиста", en: "specialist doctors", uz: "mutaxassis shifokor" } },
    { id: "rating", value: 4.9, decimals: 1, label: { ru: "средняя оценка", en: "average rating", uz: "oʻrtacha baho" } },
  ],
  trust: [
    { ru: "Анестезия последнего поколения", en: "Latest-generation anaesthesia", uz: "Soʻnggi avlod ogʻriqsizlantirish" },
    { ru: "Рентген в кабинете", en: "In-house X-ray", uz: "Kabinetda rentgen" },
    { ru: "Стерилизация по стандарту", en: "Standard-grade sterilisation", uz: "Standart boʻyicha sterilizatsiya" },
    { ru: "Гарантия на работу", en: "Warranty on our work", uz: "Ishimizga kafolat" },
    { ru: "Лечение под микроскопом", en: "Treatment under a microscope", uz: "Mikroskop ostida davolash" },
    { ru: "Цена до начала лечения", en: "Price before treatment", uz: "Narx davolanishdan oldin" },
    { ru: "Запись онлайн за минуту", en: "Book online in a minute", uz: "Onlayn yozilish bir daqiqada" },
    { ru: "Детям — бережно", en: "Gentle with kids", uz: "Bolalarga — ehtiyotkorona" },
  ],
  about: {
    title: { ru: "Клиника, в которую не страшно прийти", en: "A clinic you won’t dread visiting", uz: "Kelishdan qoʻrqmaydigan klinika" },
    paragraphs: [
      {
        ru: "Мы всё объясняем до начала лечения: что найдено, какие есть варианты и сколько это стоит. Никаких неожиданностей в чеке.",
        en: "We explain everything before treatment: what we found, the options and what they cost. No surprises on the bill.",
        uz: "Davolanishdan oldin hammasini tushuntiramiz: nima topildi, qanday variantlar bor va qancha turadi. Hisob-kitobda kutilmagan holatlar yoʻq.",
      },
      {
        ru: "В кабинетах светло и тихо, инструменты вскрываются при вас. Ждать у двери не придётся: приём идёт по записи.",
        en: "The rooms are bright and quiet, and instruments are unpacked in front of you. No waiting by the door: visits run by appointment.",
        uz: "Kabinetlar yorugʻ va sokin, asboblar sizning koʻz oldingizda ochiladi. Eshik oldida kutish shart emas: qabul yozilish boʻyicha.",
      },
    ],
    facts: [
      { k: { ru: "Приём", en: "Opening", uz: "Qabul" }, v: { ru: "Пн–Сб, 09:00–19:00", en: "Mon–Sat, 09:00–19:00", uz: "Du–Sh, 09:00–19:00" } },
      { k: { ru: "Воскресенье", en: "Sunday", uz: "Yakshanba" }, v: { ru: "Выходной", en: "Closed", uz: "Dam olish kuni" } },
      { k: { ru: "Оплата", en: "Payment", uz: "Toʻlov" }, v: { ru: "Наличные, карта, рассрочка", en: "Cash, card, instalments", uz: "Naqd, karta, boʻlib toʻlash" } },
      { k: { ru: "Язык приёма", en: "We speak", uz: "Qabul tili" }, v: { ru: "Русский, узбекский, English", en: "Russian, Uzbek, English", uz: "Rus, oʻzbek, ingliz" } },
    ],
  },
  reviews: [
    {
      name: "Дилноза",
      service: { ru: "Лечение каналов", en: "Root canal", uz: "Kanal davolash" },
      text: {
        ru: "Боялась идти пять лет. Всё сделали без боли, объяснили каждый шаг. Цена совпала с той, что назвали на осмотре.",
        en: "I avoided the dentist for five years. Painless, every step explained, and the price matched the quote.",
        uz: "Besh yil davomida borishga qoʻrqdim. Hammasi ogʻriqsiz boʻldi, har bir qadam tushuntirildi. Narx koʻrikda aytilganiga mos chiqdi.",
      },
    },
    {
      name: "Jasur",
      service: { ru: "Имплантация", en: "Implant", uz: "Implantatsiya" },
      text: {
        ru: "Поставили имплант, через неделю уже забыл, какой зуб был проблемным. Напоминания о визитах приходят в Telegram.",
        en: "Got an implant and within a week forgot which tooth was the problem. Visit reminders arrive on Telegram.",
        uz: "Implant oʻrnatishdi, bir haftadan keyin qaysi tish muammoli ekanini unutdim. Tashrif eslatmalari Telegramga keladi.",
      },
    },
    {
      name: "Малика",
      service: { ru: "Виниры", en: "Veneers", uz: "Vinirlar" },
      text: {
        ru: "Показали на 3D-модели, как будет выглядеть улыбка, и только потом начали. Получилось именно так.",
        en: "They showed my future smile on a 3D model first. It turned out exactly like that.",
        uz: "Avval 3D modelda tabassumim qanday boʻlishini koʻrsatishdi. Aynan shunday chiqdi.",
      },
    },
    {
      name: "Bobur",
      service: { ru: "Чистка и отбеливание", en: "Cleaning & whitening", uz: "Tozalash va oqartirish" },
      text: {
        ru: "Записался через сайт ночью, утром уже сидел в кресле. Без звонков и ожидания.",
        en: "Booked through the site at night and was in the chair the next morning. No calls, no waiting.",
        uz: "Tunda sayt orqali yozildim, ertalab allaqachon kreslodaman. Qoʻngʻiroqsiz va kutishsiz.",
      },
    },
    {
      name: "Нигора",
      service: { ru: "Брекеты", en: "Braces", uz: "Breketlar" },
      text: {
        ru: "Врач расписала весь план по месяцам и стоимость. Каждый визит — по времени, без очередей.",
        en: "The doctor laid out the whole plan month by month with costs. Every visit is on time, no queues.",
        uz: "Shifokor butun rejani oylar boʻyicha va narxlari bilan yozib berdi. Har bir tashrif vaqtida, navbatsiz.",
      },
    },
  ],
  faq: [
    {
      q: { ru: "Больно ли лечить зубы?", en: "Is treatment painful?", uz: "Tishni davolash ogʻriqlimi?" },
      a: {
        ru: "Мы используем современную анестезию и начинаем лечение, только когда вы её не чувствуете. Если станет неприятно — подняли руку, остановились.",
        en: "We use modern anaesthesia and start only when you can’t feel anything. If it gets uncomfortable, raise a hand and we stop.",
        uz: "Zamonaviy ogʻriqsizlantirishdan foydalanamiz va faqat siz hech narsa sezmaganingizdan keyin boshlaymiz. Noqulay boʻlsa, qoʻl koʻtaring — toʻxtaymiz.",
      },
    },
    {
      q: { ru: "Сколько стоит лечение и можно ли узнать цену заранее?", en: "How much does treatment cost, and can I know in advance?", uz: "Davolash qancha turadi va narxni oldindan bilsa boʻladimi?" },
      a: {
        ru: "Да. На сайте есть калькулятор с вилкой цен, а после осмотра вы получаете письменный план с точной суммой. Цена в плане не меняется без вашего согласия.",
        en: "Yes. The site has a calculator with price ranges, and after the check-up you get a written plan with the exact sum. It doesn’t change without your consent.",
        uz: "Ha. Saytda narx oraligʻi bilan kalkulyator bor, koʻrikdan keyin esa aniq summali yozma reja olasiz. Reja narxi sizning roziligingizsiz oʻzgarmaydi.",
      },
    },
    {
      q: { ru: "Нужно ли готовиться к первому визиту?", en: "Do I need to prepare for the first visit?", uz: "Birinchi tashrifga tayyorlanish kerakmi?" },
      a: {
        ru: "Нет. Почистите зубы как обычно и возьмите паспорт. Если есть снимки из другой клиники — покажите, это сэкономит время.",
        en: "No. Brush as usual and bring your ID. If you have X-rays from another clinic, bring them — it saves time.",
        uz: "Yoʻq. Tishlaringizni odatdagidek yuvib, pasportni olib keling. Boshqa klinikadan rentgen suratlari boʻlsa, koʻrsating — vaqtni tejaydi.",
      },
    },
    {
      q: { ru: "Есть ли гарантия на лечение?", en: "Is there a warranty?", uz: "Davolashga kafolat bormi?" },
      a: {
        ru: "Да, на пломбы, коронки, виниры и импланты. Срок указан в плане лечения, а при вопросах вы просто записываетесь на бесплатную проверку.",
        en: "Yes, on fillings, crowns, veneers and implants. The term is in your plan, and if anything feels off you book a free check.",
        uz: "Ha, plomba, toj, vinir va implantlarga. Muddat davolash rejasida koʻrsatilgan, savol tugʻilsa bepul tekshiruvga yozilasiz.",
      },
    },
    {
      q: { ru: "Принимаете ли вы детей?", en: "Do you treat children?", uz: "Bolalarni qabul qilasizmi?" },
      a: {
        ru: "Да, с пяти лет. Первый визит — знакомство без лечения: ребёнок смотрит кабинет и привыкает к креслу.",
        en: "Yes, from age five. The first visit is just getting acquainted: the child sees the room and gets used to the chair.",
        uz: "Ha, besh yoshdan. Birinchi tashrif — davolashsiz tanishuv: bola kabinetni koʻradi va kreslo bilan oshno boʻladi.",
      },
    },
    {
      q: { ru: "Можно ли оплатить частями?", en: "Can I pay in instalments?", uz: "Boʻlib toʻlasa boʻladimi?" },
      a: {
        ru: "Да, сложное лечение можно разбить на платежи по этапам. Условия озвучим в плане лечения (в демо — пример текста).",
        en: "Yes, longer treatment can be paid stage by stage. We state the terms in the plan (sample text in this demo).",
        uz: "Ha, murakkab davolashni bosqichlar boʻyicha toʻlash mumkin. Shartlar davolash rejasida aytiladi (demoda — namunaviy matn).",
      },
    },
  ],
  booking: { mode: "demo" },
};
