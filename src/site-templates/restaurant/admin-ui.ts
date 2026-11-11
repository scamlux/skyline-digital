import type { L, Locale } from "../types";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Слова после числа: склонение по Intl.PluralRules (kit/plural.ts). */
export const adminWords: Record<"views" | "calls" | "telegram" | "leads", Record<Locale, Forms>> = {
  views: {
    ru: { one: "визит", few: "визита", many: "визитов", other: "визита" },
    en: { one: "visit", other: "visits" },
    uz: { other: "ta tashrif" },
  },
  calls: {
    ru: { one: "нажатие", few: "нажатия", many: "нажатий", other: "нажатия" },
    en: { one: "tap", other: "taps" },
    uz: { other: "marta" },
  },
  telegram: {
    ru: { one: "переход", few: "перехода", many: "переходов", other: "перехода" },
    en: { one: "click", other: "clicks" },
    uz: { other: "ta oʻtish" },
  },
  leads: {
    ru: { one: "заявка", few: "заявки", many: "заявок", other: "заявки" },
    en: { one: "booking request", other: "booking requests" },
    uz: { other: "ta soʻrov" },
  },
};

/** Тексты кабинета владельца (ресторан). Язык без жаргона: «Цены», «Часы», а не «настройки». */
export const adminUi = {
  title: { ru: "Кабинет", en: "Dashboard", uz: "Kabinet" },
  openSite: { ru: "Открыть сайт", en: "Open site", uz: "Saytni ochish" },
  langLabel: { ru: "Язык", en: "Language", uz: "Til" },
  loading: { ru: "Загрузка", en: "Loading", uz: "Yuklanmoqda" },
  tabs: {
    overview: { ru: "Обзор", en: "Overview", uz: "Umumiy" },
    leads: { ru: "Заявки", en: "Requests", uz: "Soʻrovlar" },
    menu: { ru: "Меню и цены", en: "Menu & prices", uz: "Menyu va narxlar" },
    settings: { ru: "Часы и акция", en: "Hours & promo", uz: "Soat va aksiya" },
  },
  period: { ru: "За 7 дней", en: "Last 7 days", uz: "7 kun ichida" },
  // Подписи без числа в тексте: «1 заявка» и «5 заявок» читаются одинаково правильно.
  stats: {
    leads: { ru: "Заявки на бронь", en: "Booking requests", uz: "Bron soʻrovlari" },
    calls: { ru: "Нажали «Позвонить»", en: "“Call” taps", uz: "«Qoʻngʻiroq» bosildi" },
    telegram: { ru: "Переходы в Telegram", en: "Telegram clicks", uz: "Telegramga oʻtishlar" },
    views: { ru: "Визиты на сайт", en: "Site visits", uz: "Sayt tashriflari" },
  },
  vsPrev: { ru: "к прошлой неделе", en: "vs previous week", uz: "oʻtgan haftaga nisbatan" },
  insight: {
    // {views} {calls} {telegram} {leads} — числа за 7 дней, {viewsW} {callsW} {telegramW} {leadsW} — слова
    // в нужной форме, {conv} — % заявок от визитов.
    text: {
      ru: "За неделю: {views} {viewsW} сайта, {calls} {callsW} на «Позвонить», {telegram} {telegramW} в Telegram и {leads} {leadsW} на бронь — это {conv}% от визитов.",
      en: "This week: {views} {viewsW} to the site, {calls} {callsW} on “Call”, {telegram} {telegramW} to Telegram and {leads} {leadsW} — {conv}% of visits.",
      uz: "Bu hafta: saytga {views} {viewsW}, «Qoʻngʻiroq» tugmasi {calls} {callsW} bosildi, Telegramga {telegram} {telegramW} va {leads} {leadsW} — tashriflarning {conv}%.",
    },
    // {days} — дни недели с наибольшим числом заявок за 7 дней; при <3 заявок не показывается.
    tip: {
      ru: "Пик заявок: {days}. Акция на другие дни может выровнять загрузку.",
      en: "Request peak: {days}. A promo on other days could even out the load.",
      uz: "Soʻrovlar choʻqqisi: {days}. Boshqa kunlardagi aksiya yukni tenglashtirishi mumkin.",
    },
  },
  byDay: { ru: "Заявки по дням", en: "Requests by day", uz: "Kunlar boʻyicha soʻrovlar" },
  recent: { ru: "Последние заявки", en: "Recent requests", uz: "Soʻnggi soʻrovlar" },
  digest: {
    title: { ru: "Сводка в Telegram", en: "Telegram digest", uz: "Telegramda xulosa" },
    text: {
      ru: "Так будет выглядеть сводка, которую владелец получает в Telegram (образец формата).",
      en: "This is what the digest the owner gets on Telegram will look like (format sample).",
      uz: "Egasi Telegramda oladigan xulosa shunday koʻrinadi (format namunasi).",
    },
  },
  lead: {
    status: {
      new: { ru: "Новая", en: "New", uz: "Yangi" },
      confirmed: { ru: "Подтверждена", en: "Confirmed", uz: "Tasdiqlandi" },
      done: { ru: "Гости пришли", en: "Seated", uz: "Mehmonlar keldi" },
      cancelled: { ru: "Отменена", en: "Cancelled", uz: "Bekor qilindi" },
    },
    confirm: { ru: "Подтвердить", en: "Confirm", uz: "Tasdiqlash" },
    seated: { ru: "Пришли", en: "Seated", uz: "Keldi" },
    cancel: { ru: "Отменить", en: "Cancel", uz: "Bekor qilish" },
    guests: { ru: "гостей", en: "guests", uz: "mehmon" },
    wish: { ru: "Заранее", en: "Pre-order", uz: "Oldindan" },
    noTime: { ru: "время не указано", en: "no time given", uz: "vaqt koʻrsatilmagan" },
    empty: {
      ru: "Заявок пока нет. Откройте сайт и отправьте бронь — она появится здесь.",
      en: "No requests yet. Open the site and send a booking — it will show up here.",
      uz: "Hozircha soʻrov yoʻq. Saytni oching va bron yuboring — u shu yerda chiqadi.",
    },
    fromSite: { ru: "с сайта", en: "from site", uz: "saytdan" },
  },
  zones: {
    hall: { ru: "Зал", en: "Hall", uz: "Zal" },
    terrace: { ru: "Терраса", en: "Terrace", uz: "Terrasa" },
    tapchan: { ru: "Тапчан", en: "Tapchan", uz: "Tapchan" },
  },
  occasions: {
    birthday: { ru: "День рождения", en: "Birthday", uz: "Tugʻilgan kun" },
    business: { ru: "Деловая встреча", en: "Business meeting", uz: "Ish uchrashuvi" },
    family: { ru: "Семья", en: "Family", uz: "Oila" },
  },
  menu: {
    hint: {
      ru: "Нажмите на цену, чтобы изменить. Переключатель — убрать из продажи на сегодня. Всё сразу видно на сайте.",
      en: "Tap a price to change it. The switch marks a dish as out today. Changes show on the site instantly.",
      uz: "Narxni oʻzgartirish uchun ustiga bosing. Tugma — bugun sotuvdan olib tashlash. Hammasi darhol saytda koʻrinadi.",
    },
    inStock: { ru: "В наличии", en: "Available", uz: "Mavjud" },
    out: { ru: "Сегодня нет", en: "Out today", uz: "Bugun yoʻq" },
    hide: { ru: "Скрыть с сайта", en: "Hide from site", uz: "Saytdan yashirish" },
    show: { ru: "Показать на сайте", en: "Show on site", uz: "Saytda koʻrsatish" },
    hidden: { ru: "скрыто", en: "hidden", uz: "yashirilgan" },
    price: { ru: "Цена, сум", en: "Price, UZS", uz: "Narx, soʻm" },
    saved: { ru: "Сохранено", en: "Saved", uz: "Saqlandi" },
  },
  sets: {
    title: { ru: "Наборы на компанию", en: "Group sets", uz: "Davra toʻplamlari" },
    hint: {
      ru: "Гость выбирает число людей и набор — сайт подбирает порции. Здесь вы включаете набор, ставите скидку и убираете блюда из состава.",
      en: "A guest picks the party size and a set — the site picks portions. Here you switch a set on, set the discount and remove dishes.",
      uz: "Mehmon odamlar sonini va toʻplamni tanlaydi — sayt porsiyalarni tanlaydi. Bu yerda toʻplamni yoqasiz, chegirma qoʻyasiz va taomlarni olib tashlaysiz.",
    },
    on: { ru: "Показывать на сайте", en: "Show on site", uz: "Saytda koʻrsatish" },
    discount: { ru: "Скидка, %", en: "Discount, %", uz: "Chegirma, %" },
    contents: { ru: "Состав", en: "Contents", uz: "Tarkibi" },
    per: { ru: "1 порция на {n}", en: "1 portion per {n}", uz: "{n} kishiga 1 porsiya" },
    perOne: { ru: "1 на гостя", en: "1 per guest", uz: "Har kishiga 1" },
    outNow: { ru: "в стоп-листе", en: "out today", uz: "bugun yoʻq" },
  },
  settings: {
    hours: { ru: "Часы работы", en: "Opening hours", uz: "Ish vaqti" },
    open: { ru: "Открываемся", en: "Open at", uz: "Ochilish" },
    close: { ru: "Закрываемся", en: "Close at", uz: "Yopilish" },
    promo: { ru: "Акция на сайте", en: "Promo on site", uz: "Saytdagi aksiya" },
    promoOn: { ru: "Показывать баннер", en: "Show banner", uz: "Bannerni koʻrsatish" },
    promoText: { ru: "Текст баннера", en: "Banner text", uz: "Banner matni" },
    hint: {
      ru: "Статус «Открыто до …» и окно брони на сайте считаются по этим часам: последняя посадка — за 90 минут до закрытия.",
      en: "The “Open until …” status and the booking window use these hours: last seating is 90 minutes before closing.",
      uz: "Saytdagi «… gacha ochiq» holati va bron oynasi shu soatlar boʻyicha hisoblanadi: oxirgi oʻtirish yopilishdan 90 daqiqa oldin.",
    },
  },
  demo: {
    badge: { ru: "Демо-кабинет", en: "Demo dashboard", uz: "Demo kabinet" },
    text: {
      ru: "Данные хранятся в вашем браузере. Правки видны на демо-сайте только вам.",
      en: "Data lives in your browser. Changes are visible on the demo site only to you.",
      uz: "Maʼlumotlar brauzeringizda saqlanadi. Oʻzgarishlar demo-saytda faqat sizga koʻrinadi.",
    },
    seed: { ru: "Наполнить примерами", en: "Fill with examples", uz: "Namunalar bilan toʻldirish" },
    reset: { ru: "Сбросить демо", en: "Reset demo", uz: "Demoni tiklash" },
  },
  days: {
    ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
  },
} satisfies Record<string, L | Record<string, L | Record<string, L> | string[]>>;
