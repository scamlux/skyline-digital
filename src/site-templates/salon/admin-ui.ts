import type { Locale } from "../types";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Слова для подстановки после числа (склонение по Intl.PluralRules, см. kit/plural.ts). */
export const adminWords: Record<"views" | "calls" | "telegram" | "bookings" | "quizzes", Record<Locale, Forms>> = {
  views: {
    ru: { one: "визит", few: "визита", many: "визитов" },
    en: { one: "visit", other: "visits" },
    uz: { other: "tashrif" },
  },
  calls: {
    ru: { one: "нажатие", few: "нажатия", many: "нажатий" },
    en: { one: "tap", other: "taps" },
    uz: { other: "marta bosildi" },
  },
  telegram: {
    ru: { one: "переход", few: "перехода", many: "переходов" },
    en: { one: "click", other: "clicks" },
    uz: { other: "marta oʻtildi" },
  },
  bookings: {
    ru: { one: "запись", few: "записи", many: "записей" },
    en: { one: "booking", other: "bookings" },
    uz: { other: "ta yozilish" },
  },
  quizzes: {
    ru: { one: "подбор образа", few: "подбора образа", many: "подборов образа" },
    en: { one: "look quiz", other: "look quizzes" },
    uz: { other: "ta obraz tanlash" },
  },
};

/** Тексты кабинета владельца салона. Язык без жаргона: «Услуги и цены», «Мастера и график». */
export const adminUi = {
  openSite: { ru: "Открыть сайт", en: "Open site", uz: "Saytni ochish" },
  langLabel: { ru: "Язык", en: "Language", uz: "Til" },
  tabsLabel: { ru: "Разделы кабинета", en: "Dashboard sections", uz: "Kabinet boʻlimlari" },
  tabs: {
    overview: { ru: "Обзор", en: "Overview", uz: "Umumiy" },
    bookings: { ru: "Записи", en: "Bookings", uz: "Yozilishlar" },
    services: { ru: "Услуги и цены", en: "Services & prices", uz: "Xizmatlar va narxlar" },
    masters: { ru: "Мастера и график", en: "Masters & schedule", uz: "Ustalar va jadval" },
    promo: { ru: "Акция", en: "Promo", uz: "Aksiya" },
  },
  period: { ru: "За 7 дней", en: "Last 7 days", uz: "7 kun ichida" },
  stats: {
    bookings: { ru: "Записи", en: "Bookings", uz: "Yozilishlar" },
    revenue: { ru: "Сумма записей", en: "Booked value", uz: "Yozilishlar summasi" },
    telegram: { ru: "Переходы в Telegram", en: "Telegram clicks", uz: "Telegramga oʻtishlar" },
    views: { ru: "Визиты на сайт", en: "Site visits", uz: "Sayt tashriflari" },
  },
  vsPrev: { ru: "к прошлой неделе", en: "vs previous week", uz: "oʻtgan haftaga nisbatan" },
  insight: {
    // {views} {calls} {telegram} {bookings} {quizzes} — числа за 7 дней, *W — слова в нужной форме, {conv} — % записей от визитов.
    text: {
      ru: "За неделю: {views} {viewsW} сайта, {quizzes} {quizzesW}, {calls} {callsW} на «Позвонить», {telegram} {telegramW} в Telegram и {bookings} {bookingsW} — это {conv}% от визитов.",
      en: "This week: {views} {viewsW} to the site, {quizzes} {quizzesW}, {calls} {callsW} on “Call”, {telegram} {telegramW} to Telegram and {bookings} {bookingsW} — {conv}% of visits.",
      uz: "Bu hafta: saytga {views} {viewsW}, {quizzes} {quizzesW}, «Qoʻngʻiroq» tugmasi {calls} {callsW}, Telegramga {telegram} {telegramW} va {bookings} {bookingsW} — tashriflarning {conv}%.",
    },
    // {service} — самая частая услуга недели, {master} — самый загруженный мастер, {n} — его записей.
    tip: {
      ru: "Чаще всего берут «{service}». Самый загруженный мастер — {master} ({n}).",
      en: "The most booked service is “{service}”. The busiest master is {master} ({n}).",
      uz: "Eng koʻp «{service}» olinadi. Eng band usta — {master} ({n}).",
    },
    tipOnlyService: {
      ru: "Чаще всего берут «{service}».",
      en: "The most booked service is “{service}”.",
      uz: "Eng koʻp «{service}» olinadi.",
    },
  },
  byDay: { ru: "Записи по дням", en: "Bookings by day", uz: "Kunlar boʻyicha yozilishlar" },
  recent: { ru: "Последние записи", en: "Latest bookings", uz: "Soʻnggi yozilishlar" },
  digest: {
    title: { ru: "Сводка в Telegram", en: "Telegram digest", uz: "Telegramda xulosa" },
    sample: { ru: "Образец формата", en: "Format sample", uz: "Format namunasi" },
    text: {
      ru: "Так будет выглядеть сводка, которую владелец получает в Telegram (образец формата).",
      en: "This is what the digest the owner gets on Telegram will look like (format sample).",
      uz: "Egasi Telegramda oladigan xulosa shunday koʻrinadi (format namunasi).",
    },
    head: { ru: "Сводка за неделю", en: "Weekly summary", uz: "Haftalik xulosa" },
    line1: { ru: "Записей: {n}", en: "Bookings: {n}", uz: "Yozilishlar: {n}" },
    line2: { ru: "Хит недели: {service}", en: "Top service: {service}", uz: "Hafta hiti: {service}" },
    line3: { ru: "Ближайшая запись: {when}", en: "Next booking: {when}", uz: "Eng yaqin yozilish: {when}" },
    none: { ru: "нет записей", en: "none booked", uz: "yozilish yoʻq" },
    noService: { ru: "пока нет данных", en: "no data yet", uz: "hozircha maʼlumot yoʻq" },
  },
  booking: {
    status: {
      new: { ru: "Новая", en: "New", uz: "Yangi" },
      confirmed: { ru: "Подтверждена", en: "Confirmed", uz: "Tasdiqlandi" },
      arrived: { ru: "Пришёл", en: "Arrived", uz: "Keldi" },
      noshow: { ru: "Не пришёл", en: "No-show", uz: "Kelmadi" },
      cancelled: { ru: "Отменена", en: "Cancelled", uz: "Bekor qilindi" },
    },
    confirm: { ru: "Подтвердить", en: "Confirm", uz: "Tasdiqlash" },
    arrived: { ru: "Пришёл", en: "Arrived", uz: "Keldi" },
    noshow: { ru: "Не пришёл", en: "No-show", uz: "Kelmadi" },
    cancel: { ru: "Отменить", en: "Cancel", uz: "Bekor qilish" },
    restore: { ru: "Вернуть", en: "Restore", uz: "Qaytarish" },
    empty: {
      ru: "Записей пока нет. Откройте сайт и запишитесь — запись появится здесь.",
      en: "No bookings yet. Open the site and book — it will show up here.",
      uz: "Hozircha yozilishlar yoʻq. Saytni oching va yoziling — u shu yerda chiqadi.",
    },
    fromSite: { ru: "с сайта", en: "from site", uz: "saytdan" },
    anyMaster: { ru: "выбран «любой мастер»", en: "“any master” chosen", uz: "«istalgan usta» tanlangan" },
    lookLabel: { ru: "Образ", en: "Look", uz: "Obraz" },
    today: { ru: "Сегодня", en: "Today", uz: "Bugun" },
    tomorrow: { ru: "Завтра", en: "Tomorrow", uz: "Ertaga" },
    past: { ru: "Прошедшие", en: "Past", uz: "Oʻtgan" },
    upcoming: { ru: "Ближайшие", en: "Upcoming", uz: "Yaqinlashayotgan" },
    noUpcoming: { ru: "Ближайших записей нет", en: "No upcoming bookings", uz: "Yaqin yozilishlar yoʻq" },
  },
  switch: {
    label: { ru: "Бизнес", en: "Business", uz: "Biznes" },
    a: { ru: "Барбершоп", en: "Barbershop", uz: "Barbershop" },
    b: { ru: "Салон красоты", en: "Beauty salon", uz: "Goʻzallik saloni" },
  },
  services: {
    hint: {
      ru: "Нажмите на цену или время, чтобы изменить. «Скрыть» убирает услугу с сайта, из подбора образа и из записи. Всё сразу видно на сайте.",
      en: "Tap a price or a duration to change it. “Hide” removes a service from the site, the look quiz and booking. Changes show on the site instantly.",
      uz: "Narx yoki vaqtni oʻzgartirish uchun ustiga bosing. «Yashirish» xizmatni saytdan, obraz tanlashdan va yozilishdan olib tashlaydi. Hammasi darhol saytda koʻrinadi.",
    },
    packages: { ru: "Пакеты со скидкой", en: "Bundles with a discount", uz: "Chegirmali paketlar" },
    packagesHint: {
      ru: "Скидка применяется сама, когда в записи есть все услуги пакета. Цена пакета считается из цен выше.",
      en: "The discount applies by itself when a booking has all the bundle’s services. Bundle price comes from the prices above.",
      uz: "Chegirma yozilishda paketning barcha xizmatlari boʻlsa oʻzi qoʻllanadi. Paket narxi yuqoridagi narxlardan hisoblanadi.",
    },
    discount: { ru: "Скидка", en: "Discount", uz: "Chegirma" },
    pct: { ru: "%", en: "%", uz: "%" },
    bundle: { ru: "пакет", en: "bundle", uz: "paket" },
    price: { ru: "Цена", en: "Price", uz: "Narx" },
    minutes: { ru: "Время", en: "Duration", uz: "Vaqt" },
    min: { ru: "мин", en: "min", uz: "daq" },
    free: { ru: "Бесплатно", en: "Free", uz: "Bepul" },
    hide: { ru: "Скрыть с сайта", en: "Hide from site", uz: "Saytdan yashirish" },
    show: { ru: "Показать на сайте", en: "Show on site", uz: "Saytda koʻrsatish" },
    hidden: { ru: "скрыта", en: "hidden", uz: "yashirilgan" },
    saved: { ru: "Сохранено", en: "Saved", uz: "Saqlandi" },
  },
  masters: {
    hint: {
      ru: "Отметьте рабочие дни. Если убрать день, свободные окна этого мастера на сайте исчезнут.",
      en: "Mark working days. Remove a day and that master’s free slots disappear from the site.",
      uz: "Ish kunlarini belgilang. Kunni olib tashlasangiz, ustaning saytdagi boʻsh vaqtlari yoʻqoladi.",
    },
    daysLabel: { ru: "Рабочие дни", en: "Working days", uz: "Ish kunlari" },
    noDays: { ru: "Нет приёма — окон на сайте нет", en: "No working days — no slots on the site", uz: "Ish kuni yoʻq — saytda boʻsh vaqt yoʻq" },
  },
  promo: {
    title: { ru: "Акция на сайте", en: "Promo on site", uz: "Saytdagi aksiya" },
    on: { ru: "Показывать баннер", en: "Show banner", uz: "Bannerni koʻrsatish" },
    text: { ru: "Текст баннера", en: "Banner text", uz: "Banner matni" },
    hint: { ru: "Баннер показывается над первым экраном сайта.", en: "The banner appears above the first screen of the site.", uz: "Banner saytning birinchi ekrani ustida koʻrinadi." },
  },
  demo: {
    badge: { ru: "Демо-кабинет", en: "Demo dashboard", uz: "Demo kabinet" },
    text: {
      ru: "Данные хранятся в вашем браузере. Правки видны на демо-сайте только вам.",
      en: "Data lives in your browser. Changes are visible on the demo site only to you.",
      uz: "Maʼlumotlar brauzeringizda saqlanadi. Oʻzgarishlar demo-saytda faqat sizga koʻrinadi.",
    },
    reset: { ru: "Сбросить демо", en: "Reset demo", uz: "Demoni tiklash" },
    seed: { ru: "Наполнить примерами", en: "Fill with examples", uz: "Namunalar bilan toʻldirish" },
  },
  days: {
    ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
  } as Record<Locale, string[]>,
  loading: { ru: "Загрузка", en: "Loading", uz: "Yuklanmoqda" },
};
