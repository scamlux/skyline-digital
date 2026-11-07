import type { L } from "../types";

/**
 * Демо-данные барбершопа и салона «Ustara» (ustara — прямая бритва). Название, адрес, телефон,
 * мастера, отзывы и цифры вымышленные: это витрина шаблона, а не чужой бренд. Цены — реалистичные
 * ориентиры Ташкента в сумах и помечены как демо; в боевом сайте владелец меняет их в кабинете.
 */
export type Category = "men" | "women" | "care";
export const CATEGORIES: Category[] = ["men", "women", "care"];

export interface SalonService {
  /** Стабильный ключ: по нему хранятся правки владельца (цена, длительность, скрытие). */
  id: string;
  cat: Category;
  name: L;
  blurb: L;
  /** Длительность по умолчанию, минут. */
  minutes: number;
  /** Цена по умолчанию, сум. */
  price: number;
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
}

export interface SalonLook {
  id: string;
  /** Базовое имя фото работы: work-1 … work-6 (лежат -240/-480/-960 .webp). */
  photo: string;
  audience: "men" | "women";
  title: L;
  tag: L;
  alt: L;
  /** Услуги, которые подставятся в запись по кнопке «Хочу так же». */
  serviceIds: string[];
  /** Мастер, который делает такой образ лучше всего. */
  masterId: string;
}

export interface SalonReview {
  name: string;
  service: L;
  text: L;
}

export interface SalonStat {
  id: string;
  value: number;
  decimals?: number;
  plus?: boolean;
  label: L;
}

export interface SalonData {
  name: string;
  tagline: L;
  intro: L;
  /** Две строки огромного заголовка: A «Ночь» и B «Пудра». */
  hero: { a: [L, L]; b: [L, L] };
  phone: { e164: string; display: string };
  /** Telegram без @ — на него уходит запись. */
  telegram: string;
  address: L;
  mapUrl: string;
  /** Салон работает каждый день, в одни и те же часы. */
  hours: { open: string; close: string };
  /** Шаг сетки записи, минут. */
  slotMinutes: number;
  promo: L;
  photos: { hero: string; heroB: string; interior: string; tools: string };
  marquee: L[];
  stats: SalonStat[];
  services: SalonService[];
  masters: SalonMaster[];
  looks: SalonLook[];
  reviews: SalonReview[];
  faq: { q: L; a: L }[];
  about: { title: L; paragraphs: L[]; facts: { k: L; v: L }[] };
  /** «demo» — подтверждение и кнопка со ссылкой на Telegram; «telegram» — открыть чат сразу. */
  booking: { mode: "demo" | "telegram" };
}

export const salonDemo: SalonData = {
  name: "Ustara",
  tagline: {
    ru: "Барбершоп и салон красоты в центре Ташкента",
    en: "Barbershop and beauty salon in central Tashkent",
    uz: "Toshkent markazidagi barbershop va goʻzallik saloni",
  },
  intro: {
    ru: "Мужские стрижки и фейды, борода, женские стрижки и цвет. Запись за минуту, цена известна заранее, мастер не опаздывает.",
    en: "Men’s cuts and fades, beards, women’s cuts and colour. Booking takes a minute, the price is clear up front, your master is on time.",
    uz: "Erkaklar soch turmagi va feydlar, soqol, ayollar soch turmagi va rang. Yozilish bir daqiqa, narx oldindan maʼlum, usta kechikmaydi.",
  },
  hero: {
    a: [
      { ru: "точность", en: "razor", uz: "ustara" },
      { ru: "бритвы", en: "precision", uz: "aniqligi" },
    ],
    b: [
      { ru: "красота", en: "beauty", uz: "goʻzallik" },
      { ru: "без спешки", en: "unhurried", uz: "shoshilmasdan" },
    ],
  },
  phone: { e164: "+998900000033", display: "+998 90 000 00 33" },
  telegram: "ustara_demo",
  address: {
    ru: "Ташкент, улица Примерная, 12 (демо-адрес)",
    en: "Tashkent, Primernaya street 12 (demo address)",
    uz: "Toshkent, Namunaviy koʻcha, 12 (demo manzil)",
  },
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Tashkent",
  hours: { open: "10:00", close: "21:00" },
  slotMinutes: 30,
  promo: {
    ru: "Первая стрижка со скидкой 15% при записи онлайн (демо-акция)",
    en: "15% off your first cut when you book online (demo offer)",
    uz: "Onlayn yozilganda birinchi soch turmagiga 15% chegirma (demo aksiya)",
  },
  photos: { hero: "hero", heroB: "work-6", interior: "interior", tools: "tools" },
  marquee: [
    { ru: "Фейд", en: "Fade", uz: "Feyd" },
    { ru: "Классическая стрижка", en: "Classic cut", uz: "Klassik soch turmagi" },
    { ru: "Борода", en: "Beard", uz: "Soqol" },
    { ru: "Королевское бритьё", en: "Hot-towel shave", uz: "Qirollik qirishi" },
    { ru: "Женская стрижка", en: "Women’s cut", uz: "Ayollar soch turmagi" },
    { ru: "Окрашивание", en: "Colour", uz: "Boyash" },
    { ru: "Укладка", en: "Styling", uz: "Soch yotqizish" },
    { ru: "Уход", en: "Care", uz: "Parvarish" },
  ],
  stats: [
    { id: "cuts", value: 12000, plus: true, label: { ru: "стрижек сделано", en: "cuts done", uz: "soch turmagi qilindi" } },
    { id: "rating", value: 4.9, decimals: 1, label: { ru: "средняя оценка (демо)", en: "average rating (demo)", uz: "oʻrtacha baho (demo)" } },
    { id: "masters", value: 3, label: { ru: "мастера", en: "masters", uz: "usta" } },
    { id: "days", value: 7, label: { ru: "дней в неделю", en: "days a week", uz: "haftada kun" } },
  ],
  services: [
    {
      id: "mcut",
      cat: "men",
      name: { ru: "Мужская стрижка", en: "Men’s haircut", uz: "Erkaklar soch turmagi" },
      blurb: { ru: "Ножницы и машинка, мытьё головы, укладка.", en: "Scissors and clipper, wash and styling.", uz: "Qaychi va mashinka, yuvish va yotqizish." },
      minutes: 45,
      price: 90_000,
    },
    {
      id: "fade",
      cat: "men",
      name: { ru: "Фейд", en: "Fade", uz: "Feyd" },
      blurb: { ru: "Плавный переход от кожи до длины: скин, низкий, средний.", en: "A smooth blend from skin to length: skin, low or mid.", uz: "Teridan uzunlikkacha silliq oʻtish: skin, past yoki oʻrta." },
      minutes: 60,
      price: 120_000,
    },
    {
      id: "classic",
      cat: "men",
      name: { ru: "Классика и пробор", en: "Classic and side part", uz: "Klassika va oraliq" },
      blurb: { ru: "Аккуратный силуэт, чёткий пробор, помада или текстурный воск.", en: "A tidy outline, a sharp part, pomade or texture wax.", uz: "Ozoda shakl, aniq oraliq, pomada yoki teksturali mum." },
      minutes: 50,
      price: 110_000,
    },
    {
      id: "beard",
      cat: "care",
      name: { ru: "Оформление бороды", en: "Beard shaping", uz: "Soqolni shakllantirish" },
      blurb: { ru: "Форма по лицу, контуры бритвой, масло.", en: "A shape that suits your face, razor edges, oil.", uz: "Yuzga mos shakl, ustarada kontur, moy." },
      minutes: 30,
      price: 70_000,
    },
    {
      id: "razor",
      cat: "care",
      name: { ru: "Королевское бритьё", en: "Hot-towel shave", uz: "Qirollik qirishi" },
      blurb: { ru: "Опасная бритва, горячее полотенце, уход после бритья.", en: "Straight razor, hot towel, after-shave care.", uz: "Ustara, issiq sochiq, qirgandan keyingi parvarish." },
      minutes: 40,
      price: 100_000,
    },
    {
      id: "combo",
      cat: "care",
      name: { ru: "Стрижка + борода", en: "Cut + beard", uz: "Soch turmagi + soqol" },
      blurb: { ru: "Комплекс выгоднее двух услуг по отдельности.", en: "A set that costs less than the two services apart.", uz: "Majmua ikki xizmatni alohida olishdan arzonroq." },
      minutes: 75,
      price: 160_000,
    },
    {
      id: "mask",
      cat: "care",
      name: { ru: "Уход за лицом", en: "Face care", uz: "Yuz parvarishi" },
      blurb: { ru: "Очищение, маска и массаж: освежает за 20 минут.", en: "Cleansing, a mask and a massage: refreshes in 20 minutes.", uz: "Tozalash, niqob va massaj: 20 daqiqada yangilaydi." },
      minutes: 20,
      price: 60_000,
    },
    {
      id: "wcut",
      cat: "women",
      name: { ru: "Женская стрижка", en: "Women’s haircut", uz: "Ayollar soch turmagi" },
      blurb: { ru: "Консультация, мытьё, стрижка и лёгкая укладка.", en: "Consultation, wash, cut and a light styling.", uz: "Maslahat, yuvish, soch turmagi va yengil yotqizish." },
      minutes: 60,
      price: 170_000,
    },
    {
      id: "wstyle",
      cat: "women",
      name: { ru: "Укладка и локоны", en: "Styling and waves", uz: "Yotqizish va toʻlqinlar" },
      blurb: { ru: "Волны, объём, гладкая укладка на вечер или каждый день.", en: "Waves, volume or a sleek finish for the evening or every day.", uz: "Toʻlqin, hajm yoki silliq yotqizish: kechqurun yoki har kuni." },
      minutes: 45,
      price: 140_000,
    },
    {
      id: "wcolor",
      cat: "women",
      name: { ru: "Окрашивание в один тон", en: "Single-tone colour", uz: "Bir rangda boyash" },
      blurb: { ru: "Подбор оттенка, окрашивание, тонирование и уход.", en: "Shade match, colouring, toning and care.", uz: "Rang tanlash, boyash, tonlash va parvarish." },
      minutes: 150,
      price: 450_000,
    },
    {
      id: "wcare",
      cat: "women",
      name: { ru: "Уход и восстановление", en: "Repair and care", uz: "Parvarish va tiklash" },
      blurb: { ru: "Маска, ампула и массаж кожи головы для блеска.", en: "A mask, an ampoule and a scalp massage for shine.", uz: "Yaltiroq uchun niqob, ampula va bosh terisi massaji." },
      minutes: 40,
      price: 190_000,
    },
  ],
  masters: [
    {
      id: "rustam",
      name: { ru: "Рустам Алиев", en: "Rustam Aliyev", uz: "Rustam Aliyev" },
      role: { ru: "Старший барбер · фейды и борода", en: "Head barber · fades and beards", uz: "Katta barber · feyd va soqol" },
      years: 9,
      photo: "master-1",
      serviceIds: ["mcut", "fade", "classic", "beard", "razor", "combo", "mask"],
      days: [0, 1, 2, 3, 4, 5],
    },
    {
      id: "jasur",
      name: { ru: "Жасур Каримов", en: "Jasur Karimov", uz: "Jasur Karimov" },
      role: { ru: "Барбер · классика и бритьё", en: "Barber · classics and shaves", uz: "Barber · klassika va qirish" },
      years: 6,
      photo: "master-2",
      serviceIds: ["mcut", "fade", "classic", "beard", "razor", "combo", "mask"],
      days: [1, 2, 3, 4, 5, 6],
    },
    {
      id: "madina",
      name: { ru: "Мадина Юсупова", en: "Madina Yusupova", uz: "Madina Yusupova" },
      role: { ru: "Стилист-колорист", en: "Stylist and colourist", uz: "Stilist va kolorist" },
      years: 8,
      photo: "master-3",
      serviceIds: ["wcut", "wstyle", "wcolor", "wcare", "mask"],
      days: [0, 1, 2, 3, 4, 6],
    },
  ],
  looks: [
    {
      id: "w1",
      photo: "work-1",
      audience: "men",
      title: { ru: "Скин-фейд", en: "Skin fade", uz: "Skin-feyd" },
      tag: { ru: "смело", en: "bold", uz: "dadil" },
      alt: { ru: "Мужской скин-фейд, вид сзади", en: "A men’s skin fade seen from behind", uz: "Erkaklar skin-feydi, orqadan koʻrinishi" },
      serviceIds: ["fade"],
      masterId: "rustam",
    },
    {
      id: "w2",
      photo: "work-2",
      audience: "men",
      title: { ru: "Классика с пробором", en: "Classic side part", uz: "Oraliqli klassika" },
      tag: { ru: "классика", en: "classic", uz: "klassika" },
      alt: { ru: "Классическая мужская стрижка с боковым пробором", en: "A classic men’s cut with a side part", uz: "Yon oraliqli klassik erkaklar soch turmagi" },
      serviceIds: ["classic"],
      masterId: "jasur",
    },
    {
      id: "w3",
      photo: "work-3",
      audience: "men",
      title: { ru: "Текстурная стрижка", en: "Textured crop", uz: "Teksturali soch turmagi" },
      tag: { ru: "коротко и аккуратно", en: "short and neat", uz: "qisqa va ozoda" },
      alt: { ru: "Короткая текстурная мужская стрижка, вид сзади", en: "A short textured men’s crop seen from behind", uz: "Qisqa teksturali erkaklar soch turmagi, orqadan koʻrinishi" },
      serviceIds: ["mcut"],
      masterId: "rustam",
    },
    {
      id: "w4",
      photo: "work-4",
      audience: "men",
      title: { ru: "Борода по форме лица", en: "A beard to fit the face", uz: "Yuzga mos soqol" },
      tag: { ru: "борода", en: "beard", uz: "soqol" },
      alt: { ru: "Аккуратно оформленная полная борода", en: "A neatly shaped full beard", uz: "Ozoda shakllantirilgan toʻliq soqol" },
      serviceIds: ["beard"],
      masterId: "rustam",
    },
    {
      id: "w5",
      photo: "work-5",
      audience: "women",
      title: { ru: "Гладкий боб", en: "Sleek bob", uz: "Silliq bob" },
      tag: { ru: "коротко и аккуратно", en: "short and neat", uz: "qisqa va ozoda" },
      alt: { ru: "Женское каре боб, вид сзади", en: "A women’s bob seen from behind", uz: "Ayollar bob soch turmagi, orqadan koʻrinishi" },
      serviceIds: ["wcut"],
      masterId: "madina",
    },
    {
      id: "w6",
      photo: "work-6",
      audience: "women",
      title: { ru: "Длинные волны", en: "Long waves", uz: "Uzun toʻlqinlar" },
      tag: { ru: "укладка", en: "styling", uz: "yotqizish" },
      alt: { ru: "Длинные волнистые волосы, вид сзади", en: "Long wavy hair seen from behind", uz: "Uzun toʻlqinsimon sochlar, orqadan koʻrinishi" },
      serviceIds: ["wstyle"],
      masterId: "madina",
    },
  ],
  reviews: [
    {
      name: "Азиз",
      service: { ru: "Фейд", en: "Fade", uz: "Feyd" },
      text: {
        ru: "Фейд ровный, как по линейке, и держится три недели. Рустам спросил, как я укладываюсь, и подстроил длину под это.",
        en: "The fade is razor-straight and holds for three weeks. Rustam asked how I style it and adjusted the length to suit.",
        uz: "Feyd chizgʻichdek tekis va uch hafta turadi. Rustam qanday yotqizishimni soʻrab, uzunlikni shunga moslab berdi.",
      },
    },
    {
      name: "Мадина",
      service: { ru: "Окрашивание", en: "Colour", uz: "Boyash" },
      text: {
        ru: "Пришла с фото из интернета, вышло даже мягче и естественнее. Цену назвали до начала, без сюрпризов.",
        en: "I came with a photo from the internet and it turned out softer and more natural. The price was told before we started.",
        uz: "Internetdagi rasm bilan keldim, natija hatto yumshoqroq va tabiiyroq chiqdi. Narx boshlashdan oldin aytildi.",
      },
    },
    {
      name: "Бекзод",
      service: { ru: "Борода", en: "Beard", uz: "Soqol" },
      text: {
        ru: "Первый раз бритьё опасной бритвой с горячим полотенцем. Теперь хожу раз в две недели, записываюсь с телефона.",
        en: "My first straight-razor shave with a hot towel. Now I come every two weeks and book from my phone.",
        uz: "Birinchi marta ustarada issiq sochiq bilan qirdim. Endi ikki haftada bir kelaman, telefondan yozilaman.",
      },
    },
    {
      name: "Нилуфар",
      service: { ru: "Боб", en: "Bob", uz: "Bob" },
      text: {
        ru: "Наконец-то стрижка, которая сама ложится после мытья. Мадина всё объяснила, как укладывать дома.",
        en: "Finally a cut that falls into place after washing. Madina explained how to style it at home.",
        uz: "Nihoyat yuvgandan keyin oʻzi yotadigan soch turmagi. Madina uyda qanday yotqizishni tushuntirdi.",
      },
    },
    {
      name: "Тимур",
      service: { ru: "Стрижка + борода", en: "Cut + beard", uz: "Soch turmagi + soqol" },
      text: {
        ru: "Приходил с отцом и братом, всех троих взяли подряд. Чисто, быстро, чай подали, без очереди.",
        en: "Came with my dad and brother and all three of us were taken back to back. Clean, quick, tea served, no queue.",
        uz: "Ota va aka bilan keldim, uchalamizni ketma-ket olishdi. Toza, tez, choy berildi, navbat yoʻq.",
      },
    },
  ],
  faq: [
    {
      q: { ru: "Нужно ли записываться заранее?", en: "Do I need to book ahead?", uz: "Oldindan yozilish kerakmi?" },
      a: {
        ru: "Лучше да: запись занимает минуту, и мастер ждёт вас к назначенному времени. Свободные окна иногда бывают и в день обращения, смотрите сетку на сайте.",
        en: "Booking is better: it takes a minute and your master expects you on time. Same-day gaps sometimes appear, check the grid on the site.",
        uz: "Yozilgan afzal: bir daqiqa oladi, usta sizni belgilangan vaqtda kutadi. Baʼzan shu kunga ham boʻsh vaqt chiqadi, saytdagi jadvalga qarang.",
      },
    },
    {
      q: { ru: "Можно взять сразу несколько услуг?", en: "Can I combine services?", uz: "Bir necha xizmatni birga olsa boʻladimi?" },
      a: {
        ru: "Да. В форме записи отметьте всё, что нужно: время и цена сложатся сами, а свободные окна подберутся под общую длительность.",
        en: "Yes. Tick everything you need in the booking form: time and price add up by themselves and the free slots fit the total duration.",
        uz: "Ha. Yozilish shaklida kerakli hamma narsani belgilang: vaqt va narx oʻzi qoʻshiladi, boʻsh vaqtlar umumiy davomiylikka moslab tanlanadi.",
      },
    },
    {
      q: { ru: "Как узнать точную цену?", en: "How do I know the exact price?", uz: "Aniq narxni qanday bilaman?" },
      a: {
        ru: "Цены в списке и в форме записи те же, что в кассе. Для окрашивания мастер уточнит длину и густоту волос до начала и назовёт итог.",
        en: "Prices in the list and in the booking form match the till. For colouring your master checks length and thickness first and names the final price.",
        uz: "Roʻyxatdagi va yozilish shaklidagi narxlar kassadagi bilan bir xil. Boyash uchun usta boshlashdan oldin uzunlik va qalinlikni aniqlab, yakuniy narxni aytadi.",
      },
    },
    {
      q: { ru: "Что, если я опаздываю или не могу прийти?", en: "What if I’m late or can’t come?", uz: "Kechiksam yoki kela olmasam-chi?" },
      a: {
        ru: "Напишите или позвоните: перенесём без штрафа, если предупредите за два часа. При опоздании больше 15 минут мастер сократит услугу, чтобы не задерживать следующего гостя.",
        en: "Message or call: we reschedule without a fee if you tell us two hours ahead. If you are over 15 minutes late the master shortens the service so the next guest is not delayed.",
        uz: "Yozing yoki qoʻngʻiroq qiling: ikki soat oldin xabar bersangiz, jarimasiz koʻchiramiz. 15 daqiqadan koʻp kechiksangiz, usta keyingi mehmon kutmasligi uchun xizmatni qisqartiradi.",
      },
    },
    {
      q: { ru: "Вы работаете с детьми?", en: "Do you cut children’s hair?", uz: "Bolalarga ham soch olasizmi?" },
      a: {
        ru: "Да, с пяти лет. Запишитесь на мужскую стрижку и напишите в Telegram возраст: мастер подготовит детское кресло.",
        en: "Yes, from age five. Book a men’s haircut and message your child’s age on Telegram: the master will prepare a booster seat.",
        uz: "Ha, besh yoshdan. Erkaklar soch turmagiga yoziling va Telegramda yoshini yozing: usta bolalar oʻrindigʻini tayyorlaydi.",
      },
    },
  ],
  about: {
    title: { ru: "Тихий зал, острые инструменты", en: "A quiet room, sharp tools", uz: "Sokin zal, oʻtkir asboblar" },
    paragraphs: [
      {
        ru: "Ustara начиналась с двух кресел и одной опасной бритвы. Сегодня в зале три мастера, мужской и женский зал и правило: ни одного клиента вне записи, пока не закончили предыдущего.",
        en: "Ustara began with two chairs and one straight razor. Today the room has three masters, a men’s and a women’s side, and one rule: no client is rushed before the previous one is finished.",
        uz: "Ustara ikkita kreslo va bitta ustara bilan boshlangan. Bugun zalda uch usta, erkaklar va ayollar boʻlimi bor, qoidamiz esa: oldingi mehmon tugamaguncha keyingisini shoshirmaymiz.",
      },
      {
        ru: "Инструменты проходят дезинфекцию после каждого гостя, полотенца только чистые, а чай и кофе подаём бесплатно.",
        en: "Tools are disinfected after every guest, towels are always fresh, and tea and coffee are on the house.",
        uz: "Asboblar har mehmondan keyin zararsizlantiriladi, sochiqlar doim toza, choy va qahva esa bepul.",
      },
    ],
    facts: [
      { k: { ru: "Работаем", en: "Open", uz: "Ish vaqti" }, v: { ru: "каждый день, 10:00–21:00", en: "every day, 10:00–21:00", uz: "har kuni, 10:00–21:00" } },
      { k: { ru: "Залы", en: "Rooms", uz: "Zallar" }, v: { ru: "мужской и женский", en: "men’s and women’s", uz: "erkaklar va ayollar" } },
      { k: { ru: "Оплата", en: "Payment", uz: "Toʻlov" }, v: { ru: "наличные, карта, Payme, Click", en: "cash, card, Payme, Click", uz: "naqd, karta, Payme, Click" } },
      { k: { ru: "Wi-Fi и чай", en: "Wi-Fi and tea", uz: "Wi-Fi va choy" }, v: { ru: "бесплатно", en: "free", uz: "bepul" } },
    ],
  },
  booking: { mode: "demo" },
};
