import type { Locale } from "../types";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Тексты интерфейса шаблона «Клиника» (отдельно от данных клиники). */
export const clinicUi = {
  nav: {
    services: { ru: "Услуги", en: "Services", uz: "Xizmatlar" },
    calc: { ru: "Калькулятор", en: "Calculator", uz: "Kalkulyator" },
    doctors: { ru: "Врачи", en: "Doctors", uz: "Shifokorlar" },
    reviews: { ru: "Отзывы", en: "Reviews", uz: "Fikrlar" },
    contacts: { ru: "Контакты", en: "Contact", uz: "Aloqa" },
  },
  navLabel: { ru: "Разделы сайта", en: "Site sections", uz: "Sayt boʻlimlari" },
  langLabel: { ru: "Язык", en: "Language", uz: "Til" },
  book: { ru: "Записаться на приём", en: "Book an appointment", uz: "Qabulga yozilish" },
  bookShort: { ru: "Записаться", en: "Book", uz: "Yozilish" },
  calcCta: { ru: "Рассчитать лечение", en: "Estimate treatment", uz: "Davolashni hisoblash" },
  call: { ru: "Позвонить", en: "Call", uz: "Qoʻngʻiroq" },
  telegram: { ru: "Telegram", en: "Telegram", uz: "Telegram" },
  route: { ru: "Построить маршрут", en: "Get directions", uz: "Yoʻnalish" },
  quickLabel: { ru: "Быстрые действия", en: "Quick actions", uz: "Tezkor amallar" },
  hoursLabel: { ru: "Пн–Сб", en: "Mon–Sat", uz: "Du–Sh" },
  // {t} — время. Узбекское «gacha/da» ставится после времени, поэтому подстановка, а не склейка.
  openNow: { ru: "Открыто до {t}", en: "Open until {t}", uz: "{t} gacha ochiq" },
  closedNow: { ru: "Откроемся в {t}", en: "Opens at {t}", uz: "{t} da ochiladi" },
  closedMonday: { ru: "Откроемся в понедельник в {t}", en: "Opens Monday at {t}", uz: "Dushanba kuni {t} da ochiladi" },

  float: {
    rating: { ru: "320 отзывов (демо)", en: "320 reviews (demo)", uz: "320 ta fikr (demo)" },
    nextTitle: { ru: "Ближайшее окно", en: "Next free slot", uz: "Eng yaqin boʻsh vaqt" },
    today: { ru: "сегодня", en: "today", uz: "bugun" },
    tomorrow: { ru: "завтра", en: "tomorrow", uz: "ertaga" },
    noSlot: { ru: "уточняйте по телефону", en: "ask by phone", uz: "telefon orqali soʻrang" },
    painTitle: { ru: "Комфорт", en: "Comfort", uz: "Qulaylik" },
    painText: { ru: "Анестезия последнего поколения", en: "Latest-generation anaesthesia", uz: "Soʻnggi avlod ogʻriqsizlantirish" },
  },
  trustLabel: { ru: "Что вы получаете", en: "What you get", uz: "Siz nima olasiz" },
  statsNote: { ru: "Цифры в демо вымышленные", en: "Demo figures are fictional", uz: "Demodagi raqamlar xayoliy" },

  services: {
    title: { ru: "Что мы лечим", en: "What we treat", uz: "Nimani davolaymiz" },
    hint: {
      ru: "Цены — вилка «от–до», окончательную сумму назовём после осмотра. Демо-цены.",
      en: "Prices are a from–to range; we give the exact sum after the check-up. Demo prices.",
      uz: "Narxlar “dan–gacha” oraligʻida, yakuniy summani koʻrikdan keyin aytamiz. Demo narxlar.",
    },
    free: { ru: "Бесплатно", en: "Free", uz: "Bepul" },
    book: { ru: "Записаться", en: "Book", uz: "Yozilish" },
  },

  calc: {
    title: { ru: "Калькулятор лечения", en: "Treatment calculator", uz: "Davolash kalkulyatori" },
    lead: {
      ru: "Отметьте, что нужно, — увидите вилку цены и число визитов. Это ориентир, точный план — после осмотра.",
      en: "Pick what you need to see a price range and the number of visits. It’s a guide; the exact plan comes after a check-up.",
      uz: "Kerakli xizmatlarni belgilang — narx oraligʻi va tashriflar sonini koʻrasiz. Bu mezon, aniq reja koʻrikdan keyin.",
    },
    more: { ru: "Добавить: {name}", en: "Add: {name}", uz: "Qoʻshish: {name}" },
    less: { ru: "Убавить: {name}", en: "Remove: {name}", uz: "Kamaytirish: {name}" },
    totalLabel: { ru: "Ориентировочно", en: "Estimated", uz: "Taxminan" },
    visits: { ru: "Визитов: {n}", en: "Visits: {n}", uz: "Tashriflar: {n}" },
    empty: { ru: "Добавьте процедуры — посчитаем вилку", en: "Add procedures and we’ll work out a range", uz: "Protseduralarni qoʻshing — oraliqni hisoblaymiz" },
    note: {
      ru: "Не публичная оферта: итог зависит от состояния зубов. Демо-цены.",
      en: "Not a public offer: the final sum depends on your teeth. Demo prices.",
      uz: "Ommaviy oferta emas: yakuniy summa tishlar holatiga bogʻliq. Demo narxlar.",
    },
    cta: { ru: "Записаться с этим планом", en: "Book with this plan", uz: "Shu reja bilan yozilish" },
    reset: { ru: "Сбросить", en: "Clear", uz: "Tozalash" },
  },

  doctors: {
    title: { ru: "Врачи", en: "Doctors", uz: "Shifokorlar" },
    hint: { ru: "Ведут приём по записи. Врачи в демо вымышленные.", en: "Appointments by booking. Doctors in the demo are fictional.", uz: "Qabul yozilish boʻyicha. Demodagi shifokorlar xayoliy." },
    book: { ru: "Записаться к врачу", en: "Book this doctor", uz: "Shifokorga yozilish" },
  },
  // Склонения «N лет опыта» по числу: ru one/few/many, en one/other, uz одна форма.
  years: {
    ru: { one: "год опыта", few: "года опыта", many: "лет опыта" },
    en: { one: "year of experience", other: "years of experience" },
    uz: { other: "yillik tajriba" },
  } as Record<Locale, Forms>,

  reviews: {
    title: { ru: "Что говорят пациенты", en: "What patients say", uz: "Bemorlar nima deydi" },
    note: { ru: "Отзывы вымышленные — пример оформления", en: "Fictional reviews — a layout sample", uz: "Fikrlar xayoliy — koʻrinish namunasi" },
    label: { ru: "Отзывы пациентов", en: "Patient reviews", uz: "Bemorlar fikrlari" },
    prev: { ru: "Предыдущий отзыв", en: "Previous review", uz: "Oldingi fikr" },
    next: { ru: "Следующий отзыв", en: "Next review", uz: "Keyingi fikr" },
    stars: { ru: "5 из 5", en: "5 out of 5", uz: "5 dan 5" },
  },
  faq: { title: { ru: "Частые вопросы", en: "Frequently asked", uz: "Koʻp soʻraladigan savollar" } },

  form: {
    title: { ru: "Запись к врачу", en: "Book a doctor", uz: "Shifokorga yozilish" },
    lead: {
      ru: "Выберите услугу, врача и время — подтвердим запись в течение 15 минут.",
      en: "Pick a service, a doctor and a time — we confirm within 15 minutes.",
      uz: "Xizmat, shifokor va vaqtni tanlang — 15 daqiqa ichida tasdiqlaymiz.",
    },
    stepService: { ru: "Что нужно", en: "What you need", uz: "Nima kerak" },
    stepDoctor: { ru: "Врач", en: "Doctor", uz: "Shifokor" },
    anyDoctor: { ru: "Любой врач", en: "Any doctor", uz: "Istalgan shifokor" },
    anyDoctorHint: { ru: "Подберём ближайшее время", en: "We’ll find the earliest time", uz: "Eng yaqin vaqtni topamiz" },
    stepDate: { ru: "День", en: "Day", uz: "Kun" },
    dayOff: { ru: "нет приёма", en: "no appointments", uz: "qabul yoʻq" },
    closed: { ru: "выходной", en: "closed", uz: "dam olish" },
    todayShort: { ru: "сегодня", en: "today", uz: "bugun" },
    stepTime: { ru: "Время", en: "Time", uz: "Vaqt" },
    taken: { ru: "занято", en: "taken", uz: "band" },
    noFree: { ru: "нет окон", en: "no slots", uz: "boʻsh vaqt yoʻq" },
    noSlots: { ru: "На этот день свободного времени нет — выберите другой день.", en: "No free time that day — pick another day.", uz: "Bu kunga boʻsh vaqt yoʻq — boshqa kunni tanlang." },
    stepContact: { ru: "Как с вами связаться", en: "How to reach you", uz: "Siz bilan qanday bogʻlanamiz" },
    name: { ru: "Имя", en: "Name", uz: "Ism" },
    phone: { ru: "Телефон", en: "Phone", uz: "Telefon" },
    submit: { ru: "Записаться", en: "Request appointment", uz: "Yozilish" },
    summary: { ru: "Вы записываетесь: {what}", en: "You are booking: {what}", uz: "Siz yozilmoqdasiz: {what}" },
    consent: { ru: "Имя и телефон видит только клиника — нужны, чтобы подтвердить запись.", en: "Only the clinic sees your name and phone — needed to confirm the booking.", uz: "Ism va telefonni faqat klinika koʻradi — yozilishni tasdiqlash uchun kerak." },
    planTitle: { ru: "План из калькулятора", en: "Plan from the calculator", uz: "Kalkulyatordagi reja" },
    planClear: { ru: "Убрать план", en: "Remove plan", uz: "Rejani olib tashlash" },
    errService: { ru: "Выберите услугу", en: "Choose a service", uz: "Xizmatni tanlang" },
    errDate: { ru: "Выберите день", en: "Choose a day", uz: "Kunni tanlang" },
    errTime: { ru: "Выберите время", en: "Choose a time", uz: "Vaqtni tanlang" },
    errName: { ru: "Укажите имя", en: "Enter your name", uz: "Ismingizni kiriting" },
    errPhone: { ru: "Проверьте телефон", en: "Check the phone number", uz: "Telefon raqamini tekshiring" },
    errBusy: { ru: "Это время только что заняли — выберите другое.", en: "That time was just taken — pick another.", uz: "Bu vaqt hozirgina band qilindi — boshqasini tanlang." },
    successTitle: { ru: "Вы записаны", en: "You’re booked", uz: "Siz yozildingiz" },
    successText: {
      ru: "Администратор позвонит в течение 15 минут, чтобы подтвердить время.",
      en: "The front desk will call within 15 minutes to confirm the time.",
      uz: "Administrator vaqtni tasdiqlash uchun 15 daqiqa ichida qoʻngʻiroq qiladi.",
    },
    demoNote: {
      ru: "Демо: на настоящем сайте запись за секунды приходит администратору в Telegram, а здесь она уже лежит в кабинете владельца.",
      en: "Demo: on a real site the booking reaches the front desk on Telegram within seconds; here it is already in the owner’s dashboard.",
      uz: "Demo: haqiqiy saytda yozilish bir necha soniyada administratorning Telegramiga tushadi, bu yerda esa u allaqachon egasining kabinetida.",
    },
    again: { ru: "Записать ещё одного", en: "Book another", uz: "Yana yozilish" },
    openTelegram: { ru: "Открыть Telegram и отправить", en: "Open Telegram and send", uz: "Telegramni ochib yuborish" },
    openTelegramHint: {
      ru: "Нажмите кнопку: запись уйдёт, когда вы отправите сообщение в Telegram.",
      en: "Press the button: the booking is sent when you send the message on Telegram.",
      uz: "Tugmani bosing: xabarni Telegramda yuborganingizda yozilish joʻnatiladi.",
    },
    messageHead: { ru: "Запись к врачу", en: "Appointment request", uz: "Shifokorga yozilish" },
    messageService: { ru: "Услуга", en: "Service", uz: "Xizmat" },
    messageDoctor: { ru: "Врач", en: "Doctor", uz: "Shifokor" },
    messagePlan: { ru: "План", en: "Plan", uz: "Reja" },
  },

  contactsTitle: { ru: "Как нас найти", en: "Find us", uz: "Bizni toping" },
  addressLabel: { ru: "Адрес", en: "Address", uz: "Manzil" },
  hoursTitle: { ru: "Часы приёма", en: "Opening hours", uz: "Qabul vaqti" },
  hoursValue: { ru: "Пн–Сб {a}–{b}, воскресенье — выходной", en: "Mon–Sat {a}–{b}, Sunday closed", uz: "Du–Sh {a}–{b}, yakshanba — dam olish kuni" },
  mapLabel: { ru: "Схема проезда (демо)", en: "Location map (demo)", uz: "Yoʻl sxemasi (demo)" },
  photoAlt: {
    interior: { ru: "Приёмная клиники", en: "Clinic reception", uz: "Klinika qabulxonasi" },
    cabinet: { ru: "Стоматологический кабинет", en: "Dental treatment room", uz: "Stomatologik kabinet" },
    smile: { ru: "Здоровая улыбка", en: "A healthy smile", uz: "Sogʻlom tabassum" },
  },
};
