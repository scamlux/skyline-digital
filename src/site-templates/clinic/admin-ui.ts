import type { Locale } from "../types";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Слова для подстановки после числа (склонение по Intl.PluralRules, см. kit/plural.ts). */
export const adminWords: Record<"views" | "calls" | "telegram" | "bookings" | "calcs", Record<Locale, Forms>> = {
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
  calcs: {
    ru: { one: "расчёт", few: "расчёта", many: "расчётов" },
    en: { one: "estimate", other: "estimates" },
    uz: { other: "ta hisob" },
  },
};

/** Тексты кабинета владельца клиники. Язык без жаргона: «Услуги и цены», «Врачи и график». */
export const adminUi = {
  openSite: { ru: "Открыть сайт", en: "Open site", uz: "Saytni ochish" },
  langLabel: { ru: "Язык", en: "Language", uz: "Til" },
  tabsLabel: { ru: "Разделы кабинета", en: "Dashboard sections", uz: "Kabinet boʻlimlari" },
  tabs: {
    overview: { ru: "Обзор", en: "Overview", uz: "Umumiy" },
    bookings: { ru: "Записи", en: "Appointments", uz: "Yozilishlar" },
    services: { ru: "Услуги и цены", en: "Services & prices", uz: "Xizmatlar va narxlar" },
    doctors: { ru: "Врачи и график", en: "Doctors & schedule", uz: "Shifokorlar va jadval" },
    promo: { ru: "Акция", en: "Promo", uz: "Aksiya" },
  },
  period: { ru: "За 7 дней", en: "Last 7 days", uz: "7 kun ichida" },
  // Подписи без числа в тексте: «1 запись» и «5 записей» читаются одинаково правильно.
  stats: {
    bookings: { ru: "Записи на приём", en: "Appointment requests", uz: "Qabulga yozilishlar" },
    calls: { ru: "Нажали «Позвонить»", en: "“Call” taps", uz: "«Qoʻngʻiroq» bosildi" },
    telegram: { ru: "Переходы в Telegram", en: "Telegram clicks", uz: "Telegramga oʻtishlar" },
    views: { ru: "Визиты на сайт", en: "Site visits", uz: "Sayt tashriflari" },
  },
  vsPrev: { ru: "к прошлой неделе", en: "vs previous week", uz: "oʻtgan haftaga nisbatan" },
  insight: {
    // {views} {calls} {telegram} {bookings} {calcs} — числа за 7 дней, *W — слова в нужной форме, {conv} — % записей от визитов.
    text: {
      ru: "За неделю: {views} {viewsW} сайта, {calcs} {calcsW} лечения, {calls} {callsW} на «Позвонить», {telegram} {telegramW} в Telegram и {bookings} {bookingsW} — это {conv}% от визитов.",
      en: "This week: {views} {viewsW} to the site, {calcs} treatment {calcsW}, {calls} {callsW} on “Call”, {telegram} {telegramW} to Telegram and {bookings} {bookingsW} — {conv}% of visits.",
      uz: "Bu hafta: saytga {views} {viewsW}, davolash boʻyicha {calcs} {calcsW}, «Qoʻngʻiroq» tugmasi {calls} {callsW}, Telegramga {telegram} {telegramW} va {bookings} {bookingsW} — tashriflarning {conv}%.",
    },
    // {service} — услуга, на которую записывались чаще всего; {days} — дни недели с наибольшим числом записей на приём.
    // Считается из данных за 7 дней; при менее чем 3 записях не показывается.
    tip: {
      ru: "Чаще всего записываются на «{service}». Пик приёма: {days}.",
      en: "The most requested service is “{service}”. Busiest appointment days: {days}.",
      uz: "Eng koʻp «{service}» uchun yoziladi. Qabul choʻqqisi: {days}.",
    },
    tipNoDays: {
      ru: "Чаще всего записываются на «{service}».",
      en: "The most requested service is “{service}”.",
      uz: "Eng koʻp «{service}» uchun yoziladi.",
    },
  },
  byDay: { ru: "Записи по дням", en: "Appointments by day", uz: "Kunlar boʻyicha yozilishlar" },
  recent: { ru: "Последние записи", en: "Latest appointments", uz: "Soʻnggi yozilishlar" },
  digest: {
    title: { ru: "Сводка в Telegram", en: "Telegram digest", uz: "Telegramda xulosa" },
    sample: { ru: "Образец формата", en: "Format sample", uz: "Format namunasi" },
    text: {
      ru: "Так выглядит сообщение, которое администратор получает в Telegram (в боевом сайте — по расписанию, цифры из ваших данных):",
      en: "This is what the front-desk message on Telegram looks like (on a live site it arrives on schedule, with your own figures):",
      uz: "Administrator Telegramda shunday xabar oladi (jonli saytda — jadval boʻyicha, raqamlar sizning maʼlumotlaringizdan):",
    },
    head: { ru: "Сводка за неделю", en: "Weekly summary", uz: "Haftalik xulosa" },
    line1: { ru: "Записей: {n}", en: "Appointments: {n}", uz: "Yozilishlar: {n}" },
    line2: { ru: "Звонков с сайта: {n}", en: "Calls from the site: {n}", uz: "Saytdan qoʻngʻiroqlar: {n}" },
    line3: { ru: "Ближайший приём: {when}", en: "Next appointment: {when}", uz: "Eng yaqin qabul: {when}" },
    none: { ru: "нет записей", en: "none booked", uz: "yozilish yoʻq" },
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
      ru: "Записей пока нет. Откройте сайт и запишитесь к врачу — запись появится здесь.",
      en: "No appointments yet. Open the site and book a doctor — it will show up here.",
      uz: "Hozircha yozilishlar yoʻq. Saytni oching va shifokorga yoziling — u shu yerda chiqadi.",
    },
    fromSite: { ru: "с сайта", en: "from site", uz: "saytdan" },
    anyDoctor: { ru: "выбран «любой врач»", en: "“any doctor” chosen", uz: "«istalgan shifokor» tanlangan" },
    planLabel: { ru: "План", en: "Plan", uz: "Reja" },
    today: { ru: "Сегодня", en: "Today", uz: "Bugun" },
    tomorrow: { ru: "Завтра", en: "Tomorrow", uz: "Ertaga" },
    past: { ru: "Прошедшие", en: "Past", uz: "Oʻtgan" },
    upcoming: { ru: "Ближайшие", en: "Upcoming", uz: "Yaqinlashayotgan" },
    noUpcoming: { ru: "Ближайших записей нет", en: "No upcoming appointments", uz: "Yaqin yozilishlar yoʻq" },
  },
  services: {
    hint: {
      ru: "Нажмите на цену, чтобы изменить. «Скрыть» убирает услугу с сайта, из калькулятора и из записи. Всё сразу видно на сайте.",
      en: "Tap a price to change it. “Hide” removes a service from the site, the calculator and booking. Changes show on the site instantly.",
      uz: "Narxni oʻzgartirish uchun ustiga bosing. «Yashirish» xizmatni saytdan, kalkulyatordan va yozilishdan olib tashlaydi. Hammasi darhol saytda koʻrinadi.",
    },
    from: { ru: "От", en: "From", uz: "Dan" },
    to: { ru: "До", en: "To", uz: "Gacha" },
    free: { ru: "Бесплатно", en: "Free", uz: "Bepul" },
    hide: { ru: "Скрыть с сайта", en: "Hide from site", uz: "Saytdan yashirish" },
    show: { ru: "Показать на сайте", en: "Show on site", uz: "Saytda koʻrsatish" },
    hidden: { ru: "скрыта", en: "hidden", uz: "yashirilgan" },
    inCalc: { ru: "в калькуляторе", en: "in calculator", uz: "kalkulyatorda" },
    saved: { ru: "Сохранено", en: "Saved", uz: "Saqlandi" },
  },
  doctors: {
    hint: {
      ru: "Отметьте приёмные дни. Если убрать день, свободные окна этого врача на сайте исчезнут. Воскресенье — выходной у клиники.",
      en: "Mark working days. Remove a day and that doctor’s free slots disappear from the site. Sunday is the clinic’s day off.",
      uz: "Qabul kunlarini belgilang. Kunni olib tashlasangiz, shifokorning saytdagi boʻsh vaqtlari yoʻqoladi. Yakshanba — klinikaning dam olish kuni.",
    },
    daysLabel: { ru: "Приёмные дни", en: "Working days", uz: "Qabul kunlari" },
    noDays: { ru: "Нет приёма — окон на сайте нет", en: "No appointments — no slots on the site", uz: "Qabul yoʻq — saytda boʻsh vaqt yoʻq" },
    sunday: { ru: "Воскресенье — выходной", en: "Sunday — closed", uz: "Yakshanba — dam olish kuni" },
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
