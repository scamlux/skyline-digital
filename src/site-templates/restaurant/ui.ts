import type { L, Locale } from "../types";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** «гость / гостя / гостей» — склонение через kit/plural.ts. */
export const guestWords: Record<Locale, Forms> = {
  ru: { one: "гость", few: "гостя", many: "гостей", other: "гостя" },
  en: { one: "guest", other: "guests" },
  uz: { other: "mehmon" },
};

/** «блюдо / блюда / блюд» для сводки предзаказа. */
export const dishWords: Record<Locale, Forms> = {
  ru: { one: "блюдо", few: "блюда", many: "блюд", other: "блюда" },
  en: { one: "dish", other: "dishes" },
  uz: { other: "ta taom" },
};

/**
 * Тексты интерфейса шаблона «Ресторан» (отдельно от данных ресторана).
 * Коротко: заголовки до пяти слов, одна поясняющая строка на блок.
 */
export const restaurantUi = {
  nav: {
    menu: { ru: "Меню", en: "Menu", uz: "Menyu" },
    group: { ru: "Компания", en: "Groups", uz: "Davra" },
    contacts: { ru: "Контакты", en: "Contact", uz: "Aloqa" },
  },
  navLabel: { ru: "Разделы сайта", en: "Site sections", uz: "Sayt boʻlimlari" },
  langLabel: { ru: "Язык", en: "Language", uz: "Til" },
  book: { ru: "Забронировать стол", en: "Book a table", uz: "Stol band qilish" },
  bookShort: { ru: "Забронировать", en: "Book", uz: "Band qilish" },
  seeMenu: { ru: "Меню", en: "Menu", uz: "Menyu" },
  call: { ru: "Позвонить", en: "Call", uz: "Qoʻngʻiroq" },
  telegram: { ru: "Telegram", en: "Telegram", uz: "Telegram" },
  route: { ru: "Построить маршрут", en: "Get directions", uz: "Yoʻnalish" },
  // {t} — время. Узбекское «gacha/da» ставится после времени, поэтому подстановка, а не склейка.
  openNow: { ru: "Открыто до {t}", en: "Open until {t}", uz: "{t} gacha ochiq" },
  closedNow: { ru: "Откроемся в {t}", en: "Opens at {t}", uz: "{t} da ochiladi" },
  hoursLabel: { ru: "Ежедневно", en: "Daily", uz: "Har kuni" },
  quickLabel: { ru: "Быстрые действия", en: "Quick actions", uz: "Tezkor amallar" },

  menu: {
    title: { ru: "Меню", en: "Menu", uz: "Menyu" },
    lead: {
      ru: "Нажмите на значок у блюда — забронируем стол под него.",
      en: "Tap the icon on a dish — we book a table around it.",
      uz: "Taomdagi belgini bosing — stolni shu taom uchun band qilamiz.",
    },
    filtersLabel: { ru: "Фильтры меню", en: "Menu filters", uz: "Menyu filtrlari" },
    all: { ru: "Всё", en: "All", uz: "Hammasi" },
    unavailable: { ru: "Сегодня нет", en: "Out today", uz: "Bugun yoʻq" },
    tags: {
      spicy: { ru: "Острое", en: "Spicy", uz: "Achchiq" },
      veg: { ru: "Без мяса", en: "Meat-free", uz: "Goʻshtsiz" },
      hit: { ru: "Хит", en: "Popular", uz: "Mashhur" },
    },
    wish: { ru: "Прийти на это", en: "Come for this", uz: "Shu uchun kelish" },
    empty: { ru: "Под фильтр ничего не нашлось.", en: "Nothing matches the filter.", uz: "Filtrga mos taom topilmadi." },
  },

  sets: {
    title: { ru: "Стол на компанию", en: "A table for the group", uz: "Davra uchun dasturxon" },
    lead: {
      ru: "Скажите, сколько вас, — подберём блюда и посчитаем.",
      en: "Tell us how many you are — we pick dishes and count.",
      uz: "Necha kishiligingizni ayting — taomlarni tanlab, hisoblab beramiz.",
    },
    guests: { ru: "Сколько вас", en: "How many", uz: "Necha kishi" },
    less: { ru: "Меньше гостей", en: "Fewer guests", uz: "Mehmon kamroq" },
    more: { ru: "Больше гостей", en: "More guests", uz: "Mehmon koʻproq" },
    pick: { ru: "Набор", en: "Set", uz: "Toʻplam" },
    lines: { ru: "Состав набора", en: "Set contents", uz: "Toʻplam tarkibi" },
    qtyLess: { ru: "Убавить", en: "Fewer", uz: "Kamaytirish" },
    qtyMore: { ru: "Добавить", en: "More", uz: "Koʻpaytirish" },
    subtotal: { ru: "Блюда", en: "Dishes", uz: "Taomlar" },
    discount: { ru: "Скидка на набор {p}%", en: "Set discount {p}%", uz: "Toʻplamga chegirma {p}%" },
    total: { ru: "Итого", en: "Total", uz: "Jami" },
    editHint: { ru: "Количество можно менять", en: "You can change the amounts", uz: "Miqdorni oʻzgartirish mumkin" },
    empty: { ru: "Все блюда этого набора сегодня недоступны.", en: "All dishes of this set are unavailable today.", uz: "Bu toʻplamdagi barcha taomlar bugun mavjud emas." },
    cta: { ru: "Прийти на это", en: "Come for this", uz: "Shu uchun kelish" },
    perGuest: { ru: "на гостя", en: "per guest", uz: "bir kishiga" },
  },

  zones: {
    hall: { ru: "Зал", en: "Hall", uz: "Zal" },
    terrace: { ru: "Терраса", en: "Terrace", uz: "Terrasa" },
    tapchan: { ru: "Тапчан", en: "Tapchan", uz: "Tapchan" },
    upTo: { ru: "до {n}", en: "up to {n}", uz: "{n} gacha" },
    range: { ru: "{a}–{b}", en: "{a}–{b}", uz: "{a}–{b}" },
    noFit: { ru: "Не подходит для вашей компании", en: "Not suitable for your party", uz: "Sizning davrangizga mos emas" },
  },
  occasions: {
    birthday: { ru: "День рождения", en: "Birthday", uz: "Tugʻilgan kun" },
    business: { ru: "Деловая встреча", en: "Business meeting", uz: "Ish uchrashuvi" },
    family: { ru: "Семья", en: "Family", uz: "Oila" },
  },

  sheet: {
    title: { ru: "Бронь стола", en: "Reserve a table", uz: "Stol band qilish" },
    close: { ru: "Закрыть", en: "Close", uz: "Yopish" },
    stepsLabel: { ru: "Шаги брони", en: "Booking steps", uz: "Bron bosqichlari" },
    steps: {
      guests: { ru: "Гости", en: "Guests", uz: "Mehmonlar" },
      time: { ru: "Время", en: "Time", uz: "Vaqt" },
      contacts: { ru: "Контакты", en: "Contacts", uz: "Aloqa" },
    },
    guestsTitle: { ru: "Сколько вас?", en: "How many of you?", uz: "Necha kishisiz?" },
    occasionTitle: { ru: "Повод", en: "Occasion", uz: "Sabab" },
    optional: { ru: "по желанию", en: "optional", uz: "ixtiyoriy" },
    dateTitle: { ru: "Когда?", en: "When?", uz: "Qachon?" },
    today: { ru: "Сегодня", en: "Today", uz: "Bugun" },
    tomorrow: { ru: "Завтра", en: "Tomorrow", uz: "Ertaga" },
    zoneTitle: { ru: "Где сидим?", en: "Where to sit?", uz: "Qayerda oʻtiramiz?" },
    timeTitle: { ru: "Время", en: "Time", uz: "Vaqt" },
    partsLabel: { ru: "Часть дня", en: "Part of the day", uz: "Kun qismi" },
    parts: {
      morning: { ru: "Утро", en: "Morning", uz: "Ertalab" },
      day: { ru: "День", en: "Day", uz: "Kunduz" },
      evening: { ru: "Вечер", en: "Evening", uz: "Kechqurun" },
    },
    noRoom: { ru: "На это время мест нет — выберите другое.", en: "No tables for this time — pick another.", uz: "Bu vaqtga joy yoʻq — boshqasini tanlang." },
    noDays: { ru: "На ближайшую неделю мест нет — позвоните нам.", en: "No tables this week — please call us.", uz: "Yaqin haftaga joy yoʻq — qoʻngʻiroq qiling." },
    taken: { ru: "занято", en: "taken", uz: "band" },
    wish: { ru: "Хотим попробовать", en: "We want to try", uz: "Tatib koʻrmoqchimiz" },
    wishRemove: { ru: "Убрать предзаказ", en: "Remove pre-order", uz: "Oldindan buyurtmani olib tashlash" },
    name: { ru: "Имя", en: "Name", uz: "Ism" },
    phone: { ru: "Телефон", en: "Phone", uz: "Telefon" },
    consent: {
      ru: "Имя и телефон видит только ресторан — нужны для подтверждения.",
      en: "Only the restaurant sees your name and phone — to confirm.",
      uz: "Ism va telefonni faqat restoran koʻradi — tasdiqlash uchun.",
    },
    errName: { ru: "Укажите имя", en: "Enter your name", uz: "Ismingizni kiriting" },
    errPhone: { ru: "Укажите телефон: +998 90 123 45 67", en: "Enter a phone: +998 90 123 45 67", uz: "Telefonni kiriting: +998 90 123 45 67" },
    errTime: { ru: "Выберите время", en: "Pick a time", uz: "Vaqtni tanlang" },
    errTaken: { ru: "Это время только что заняли — выберите другое.", en: "This time was just taken — pick another.", uz: "Bu vaqt hozirgina band qilindi — boshqasini tanlang." },
    next: { ru: "Далее", en: "Next", uz: "Keyingisi" },
    back: { ru: "Назад", en: "Back", uz: "Orqaga" },
    submit: { ru: "Забронировать", en: "Request booking", uz: "Band qilish" },
    successTitle: { ru: "Заявка принята", en: "Request received", uz: "Soʻrov qabul qilindi" },
    successText: { ru: "Подтвердим стол в течение 15 минут.", en: "We confirm your table within 15 minutes.", uz: "Stolni 15 daqiqa ichida tasdiqlaymiz." },
    demoNote: {
      ru: "Демо: на настоящем сайте заявка за секунды приходит владельцу в Telegram.",
      en: "Demo: on a real site the request reaches the owner on Telegram within seconds.",
      uz: "Demo: haqiqiy saytda soʻrov bir necha soniyada egasining Telegramiga tushadi.",
    },
    openTelegram: { ru: "Открыть Telegram и отправить", en: "Open Telegram and send", uz: "Telegramni ochib yuborish" },
    openTelegramHint: {
      ru: "Если Telegram не открылся сам — нажмите кнопку: заявка уйдёт, когда вы отправите сообщение.",
      en: "If Telegram did not open by itself, press the button: the request is sent when you send the message.",
      uz: "Telegram oʻzi ochilmasa, tugmani bosing: xabarni yuborganingizda soʻrov joʻnatiladi.",
    },
    done: { ru: "Готово", en: "Done", uz: "Tayyor" },
    tg: {
      head: { ru: "Бронь стола", en: "Table booking", uz: "Stol bandi" },
      when: { ru: "Когда", en: "When", uz: "Qachon" },
      guests: { ru: "Гостей", en: "Guests", uz: "Mehmonlar" },
      wish: { ru: "Заранее", en: "Pre-order", uz: "Oldindan" },
    },
  },

  delivery: {
    title: { ru: "Заказать домой", en: "Order for delivery", uz: "Uyga buyurtma" },
    lead: {
      ru: "Привезёт курьер. В Telegram — напрямую, без комиссии.",
      en: "A courier brings it. On Telegram — direct, no commission.",
      uz: "Kuryer olib keladi. Telegramda — toʻgʻridan-toʻgʻri, komissiyasiz.",
    },
    direct: { ru: "Напрямую", en: "Direct", uz: "Toʻgʻridan-toʻgʻri" },
    app: { ru: "Через приложение", en: "Via the app", uz: "Ilova orqali" },
  },
  reviews: {
    title: { ru: "Что говорят гости", en: "What guests say", uz: "Mehmonlar fikri" },
    demo: { ru: "Демо-отзывы", en: "Demo reviews", uz: "Demo fikrlar" },
    label: { ru: "Отзывы гостей", en: "Guest reviews", uz: "Mehmonlar fikrlari" },
    prev: { ru: "Назад", en: "Previous", uz: "Oldingi" },
    next: { ru: "Вперёд", en: "Next", uz: "Keyingi" },
  },
  contacts: {
    title: { ru: "Как нас найти", en: "Find us", uz: "Bizni toping" },
    mapLabel: { ru: "Схема района", en: "Area sketch", uz: "Hudud sxemasi" },
    hoursStatic: { ru: "Ежедневно {a}–{b}", en: "Daily {a}–{b}", uz: "Har kuni {a}–{b}" },
  },
  factsLabel: { ru: "Ресторан в цифрах", en: "The restaurant in numbers", uz: "Restoran raqamlarda" },
  footerDemo: {
    ru: "Демо-сайт: бизнес, адрес, отзывы и цифры вымышлены.",
    en: "Demo site: the business, address, reviews and numbers are fictional.",
    uz: "Demo sayt: biznes, manzil, fikrlar va raqamlar xayoliy.",
  },
} satisfies Record<string, L | Record<string, L | Record<string, L>>>;
