import type { L, Locale } from "../types";
import type { Cat } from "./data";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;

/** Формы «осталось N»: ru склоняется (остался 1 / осталось 3), uz — одна форма. */
export const leftForms: Record<Locale, Forms> = {
  ru: { one: "остался {n}", few: "осталось {n}", many: "осталось {n}" },
  en: { one: "{n} left", other: "{n} left" },
  uz: { other: "{n} ta qoldi" },
};

/** Тексты интерфейса сайта кофейни. Коротко: заголовки до пяти слов, одна строка пояснения на блок. */
export const cafeUi = {
  navLabel: { ru: "Разделы", en: "Sections", uz: "Boʻlimlar" },
  nav: {
    menu: { ru: "Меню", en: "Menu", uz: "Menyu" },
    card: { ru: "Карта", en: "Card", uz: "Karta" },
    contacts: { ru: "Контакты", en: "Contacts", uz: "Aloqa" },
  },
  langLabel: { ru: "Язык", en: "Language", uz: "Til" },
  order: { ru: "Заказать навынос", en: "Order to go", uz: "Olib ketishga buyurtma" },
  orderShort: { ru: "Заказать", en: "Order", uz: "Buyurtma" },
  seeMenu: { ru: "Меню", en: "Menu", uz: "Menyu" },
  openUntil: { ru: "Открыто до {t}", en: "Open until {t}", uz: "{t} gacha ochiq" },
  closedUntil: { ru: "Закрыто · откроемся в {t}", en: "Closed · opens at {t}", uz: "Yopiq · {t} da ochiladi" },
  hoursStatic: { ru: "Ежедневно {a}–{b}", en: "Daily {a}–{b}", uz: "Har kuni {a}–{b}" },

  menuTitle: { ru: "Меню", en: "Menu", uz: "Menyu" },
  menuLead: { ru: "Выберите, настройте и заберите без очереди.", en: "Pick, customise and collect without a queue.", uz: "Tanlang, sozlang va navbatsiz oling." },
  catsLabel: { ru: "Категории меню", en: "Menu categories", uz: "Menyu turlari" },
  cats: {
    coffee: { ru: "Кофе", en: "Coffee", uz: "Kofe" },
    notcoffee: { ru: "Не кофе", en: "Not coffee", uz: "Kofesiz" },
    bakery: { ru: "Выпечка", en: "Bakery", uz: "Pishiriq" },
    breakfast: { ru: "Завтраки", en: "Breakfast", uz: "Nonushta" },
    dessert: { ru: "Десерты", en: "Desserts", uz: "Desertlar" },
  } satisfies Record<Cat, L>,
  tags: {
    hit: { ru: "хит", en: "hit", uz: "xit" },
    new: { ru: "новинка", en: "new", uz: "yangi" },
  },
  soldOut: { ru: "закончилось", en: "sold out", uz: "tugadi" },
  offToday: { ru: "нет сегодня", en: "not today", uz: "bugun yoʻq" },
  inCart: { ru: "в корзине", en: "in cart", uz: "savatda" },
  addAria: { ru: "Добавить", en: "Add", uz: "Qoʻshish" },
  customise: { ru: "Настроить", en: "Customise", uz: "Sozlash" },
  promoZero: { ru: "0 сум", en: "0 UZS", uz: "0 soʻm" },

  item: {
    add: { ru: "Добавить", en: "Add", uz: "Qoʻshish" },
    close: { ru: "Закрыть", en: "Close", uz: "Yopish" },
    soldOut: { ru: "Сейчас недоступно", en: "Unavailable now", uz: "Hozir mavjud emas" },
  },

  cart: {
    open: { ru: "Корзина", en: "Cart", uz: "Savat" },
    title: { ru: "Ваш заказ", en: "Your order", uz: "Buyurtmangiz" },
    close: { ru: "Закрыть", en: "Close", uz: "Yopish" },
    empty: { ru: "Корзина пуста — выберите что-нибудь вкусное.", en: "The cart is empty — pick something tasty.", uz: "Savat boʻsh — mazali narsa tanlang." },
    toMenu: { ru: "К меню", en: "To the menu", uz: "Menyuga" },
    steps: {
      order: { ru: "Заказ", en: "Order", uz: "Buyurtma" },
      time: { ru: "Время", en: "Time", uz: "Vaqt" },
      contacts: { ru: "Контакты", en: "Contacts", uz: "Aloqa" },
    },
    stepsLabel: { ru: "Шаги заказа", en: "Order steps", uz: "Buyurtma bosqichlari" },
    total: { ru: "Итого", en: "Total", uz: "Jami" },
    next: { ru: "Дальше", en: "Next", uz: "Keyingi" },
    back: { ru: "Назад", en: "Back", uz: "Orqaga" },
    send: { ru: "Отправить заказ", en: "Send order", uz: "Buyurtmani yuborish" },
    less: { ru: "Меньше", en: "Less", uz: "Kamroq" },
    more: { ru: "Больше", en: "More", uz: "Koʻproq" },
    remove: { ru: "Убрать", en: "Remove", uz: "Olib tashlash" },
    freeCup: { ru: "Бесплатный кофе по карте", en: "Free coffee from your card", uz: "Karta boʻyicha bepul kofe" },
    freeCupOff: { ru: "−{sum}", en: "−{sum}", uz: "−{sum}" },
    pickupTitle: { ru: "Когда заберёте?", en: "When will you pick up?", uz: "Qachon olasiz?" },
    quick: { ru: "через {n} мин", en: "in {n} min", uz: "{n} daqiqadan keyin" },
    orTime: { ru: "или время", en: "or a time", uz: "yoki vaqt" },
    pickTime: { ru: "Выбрать время", en: "Choose a time", uz: "Vaqtni tanlash" },
    closedNote: { ru: "Сейчас закрыто — приготовим к {when}.", en: "We are closed now — we will have it ready for {when}.", uz: "Hozir yopiq — {when} ga tayyorlaymiz." },
    pickupAt: { ru: "Заберу: {when}", en: "Pickup: {when}", uz: "Olaman: {when}" },
    pickupError: { ru: "Выберите время получения.", en: "Choose a pickup time.", uz: "Olish vaqtini tanlang." },
    name: { ru: "Имя", en: "Name", uz: "Ism" },
    phone: { ru: "Телефон", en: "Phone", uz: "Telefon" },
    nameError: { ru: "Введите имя.", en: "Enter your name.", uz: "Ismingizni kiriting." },
    phoneError: { ru: "Введите телефон, не меньше 9 цифр.", en: "Enter a phone number, at least 9 digits.", uz: "Telefon raqamini kiriting, kamida 9 ta raqam." },
    stockError: { ru: "Часть позиций закончилась — обновили корзину.", en: "Some items ran out — the cart is updated.", uz: "Ayrim taomlar tugadi — savat yangilandi." },
    payNote: { ru: "Оплата на кассе при получении.", en: "Pay at the counter on pickup.", uz: "Toʻlov olishda kassada." },
  },

  done: {
    title: { ru: "Заказ принят", en: "Order received", uz: "Buyurtma qabul qilindi" },
    pickup: { ru: "Заберёте: {when}", en: "Pickup: {when}", uz: "Olasiz: {when}" },
    stamp: { ru: "+1 печать на карте", en: "+1 stamp on your card", uz: "Kartada +1 muhr" },
    redeemed: { ru: "Бесплатный кофе использован", en: "Free coffee used", uz: "Bepul kofe ishlatildi" },
    telegram: { ru: "Открыть в Telegram", en: "Open in Telegram", uz: "Telegramda ochish" },
    close: { ru: "Готово", en: "Done", uz: "Tayyor" },
    demo: { ru: "Демо: заказ виден в кабинете владельца.", en: "Demo: the order shows in the owner dashboard.", uz: "Demo: buyurtma egasi kabinetida koʻrinadi." },
  },
  tgWords: {
    pickup: { ru: "Заберу", en: "Pickup", uz: "Olaman" },
    total: { ru: "Итого", en: "Total", uz: "Jami" },
  },

  showcaseTitle: { ru: "Сегодня в витрине", en: "In the case today", uz: "Bugun vitrinada" },
  showcaseLead: { ru: "Свежее, пока не разобрали.", en: "Fresh, while it lasts.", uz: "Yangi, tugamaguncha." },
  showcaseLabel: { ru: "Витрина", en: "Pastry case", uz: "Vitrina" },

  loyalty: {
    title: { ru: "6-й кофе бесплатно", en: "6th coffee is free", uz: "6-kofe bepul" },
    lead: { ru: "Каждый заказ — печать. Пять печатей, и шестой кофе в подарок.", en: "Every order earns a stamp. Five stamps, and the sixth coffee is a gift.", uz: "Har buyurtma — bitta muhr. Beshta muhr, oltinchi kofe sovgʻa." },
    cardLabel: { ru: "Карта лояльности {name}", en: "{name} loyalty card", uz: "{name} sodiqlik kartasi" },
    free: { ru: "бесплатно", en: "free", uz: "bepul" },
    progress: { ru: "{n} из {goal}", en: "{n} of {goal}", uz: "{n} / {goal}" },
    ready: { ru: "Кофе в подарок — в следующем заказе", en: "A free coffee on your next order", uz: "Keyingi buyurtmada kofe sovgʻa" },
    addDemo: { ru: "+1 печать (демо)", en: "+1 stamp (demo)", uz: "+1 muhr (demo)" },
    stampAria: { ru: "Печать {n}", en: "Stamp {n}", uz: "Muhr {n}" },
  },

  atmo: {
    label: { ru: "Атмосфера", en: "Atmosphere", uz: "Muhit" },
    wifi: { ru: "Wi-Fi", en: "Wi-Fi", uz: "Wi-Fi" },
    plugs: { ru: "Розетки", en: "Sockets", uz: "Rozetkalar" },
    quiet: { ru: "Тихо {a}–{b}", en: "Quiet {a}–{b}", uz: "Sokin {a}–{b}" },
  },

  reviewsTitle: { ru: "Говорят гости", en: "Guests say", uz: "Mehmonlar aytadi" },
  reviewsDemo: { ru: "демо-отзывы", en: "demo reviews", uz: "demo fikrlar" },
  reviewsLabel: { ru: "Отзывы", en: "Reviews", uz: "Fikrlar" },
  prev: { ru: "Назад", en: "Previous", uz: "Oldingi" },
  next: { ru: "Вперёд", en: "Next", uz: "Keyingi" },

  contactsTitle: { ru: "Заходите", en: "Come by", uz: "Xush kelibsiz" },
  address: { ru: "Адрес", en: "Address", uz: "Manzil" },
  route: { ru: "Маршрут", en: "Directions", uz: "Yoʻnalish" },
  hours: { ru: "Часы", en: "Hours", uz: "Soatlar" },
  call: { ru: "Позвонить", en: "Call", uz: "Qoʻngʻiroq" },
  mapLabel: { ru: "Схема: кофейня {name}", en: "Map: {name} coffee shop", uz: "Xarita: {name} kofexonasi" },
  demoNote: { ru: "Демо-сайт: адрес, цены и отзывы вымышлены.", en: "Demo site: address, prices and reviews are fictional.", uz: "Demo sayt: manzil, narxlar va fikrlar uydirma." },
} satisfies Record<string, unknown>;
