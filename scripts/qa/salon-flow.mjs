// Сквозной сценарий шаблона «Салон» (два сайта: A «USTARA Barbershop», B «Nafis Beauty»).
// Подбор образа, предвыбор из образа, сумма нескольких услуг с пакетом, фильтр времени суток,
// запись в три шага (шторка), кабинет с переключателем бизнеса, выходной мастера, правка цены и скидки.
// Chrome — локальный (puppeteer-core), Playwright/Chromium не ставим.
// Запуск: node scripts/qa/salon-flow.mjs ; BASE=http://localhost:3102 ; OUT=<папка скриншотов> ; SHOTS=0 чтобы без скриншотов
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3102";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.env.OUT || "/Users/muhammadumar/Desktop/skyline-digital/screenshots";
const SHOTS = process.env.SHOTS !== "0";
const STYLES = (process.env.STYLES || "a,b").split(",");
const ALL_VIEWPORTS = [
  { name: "360", width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "430", width: 430, height: 932, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "1440", width: 1440, height: 900 },
];
const VIEWPORTS = ALL_VIEWPORTS.filter((v) => !process.env.VIEWPORTS || process.env.VIEWPORTS.split(",").includes(v.name));
const MIN_TAP = 44;

/** Ожидания по бизнесам: названия плиток, итоги, мастер для выходного. Цены из data-men / data-women. */
const SPEC = {
  a: {
    brand: "USTARA",
    business: "Барбершоп",
    quiz: ["Смело", "С бородой"],
    quizTotal: /190 000/,
    quizNames: /Фейд/,
    pick: [["Стрижки", "Стрижка"], ["Борода и бритьё", "Борода"]],
    pickTotal: /144 000/,
    pickFull: /160 000/,
    incompatible: null,
    offMaster: "Рустам",
    priceTile: "Стрижка",
    priceNew: "100000",
    priceShown: /100 000/,
    filterChip: "Борода",
    guest: "Тест Барбер",
    perk: "Кофе",
  },
  b: {
    brand: "Nafis",
    business: "Салон красоты",
    quiz: ["Ногти", "На праздник"],
    quizTotal: /210 000/,
    quizNames: /Маникюр/,
    pick: [["Ногти", "Маникюр"], ["Ногти", "Педикюр"]],
    pickTotal: /243 000/,
    pickFull: /270 000/,
    incompatible: ["Волосы", "Стрижка"],
    offMaster: "Мадина",
    priceTile: "Стрижка",
    priceNew: "200000",
    priceShown: /200 000/,
    filterChip: "Ногти",
    guest: "Тест Салон",
    perk: "Чай",
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok: !!ok, extra });
  if (process.env.VERBOSE) console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
};
const norm = (s) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"], protocolTimeout: 180000 });

/** Страница с проверкой консоли и ответов (404 на картинках и т.п.). */
async function openPage(vp, reduceMotion = false) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(30000);
  await page.setViewport(vp);
  if (reduceMotion) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  const errors = [];
  const ignore = /_vercel|insights/;
  page.on("pageerror", (e) => errors.push(e.message));
  // «Failed to load resource» без адреса — двойник ответа 404/500: настоящие ловит обработчик response (с адресом).
  page.on("console", (m) => m.type() === "error" && !ignore.test(m.text()) && !/^Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && !ignore.test(r.url()) && errors.push(`${r.status()} ${r.url()}`));
  return { ctx, page, errors };
}

const helpers = (page) => {
  const text = (sel) => page.$eval(sel, (el) => el.textContent.replace(/ /g, " ").replace(/\s+/g, " ").trim());
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const clickText = async (selector, label, scope = "") => {
    const handle = await page.evaluateHandle(
      (selector, label, scope) => [...document.querySelectorAll(`${scope} ${selector}`)].find((e) => e.textContent.replace(/ /g, " ").includes(label)),
      selector,
      label,
      scope,
    );
    const el = handle.asElement();
    if (!el) throw new Error(`нет ${scope} ${selector} «${label}»`);
    await el.evaluate((e) => e.scrollIntoView({ block: "center", inline: "center" }));
    await sleep(120);
    await el.click();
    await sleep(150);
  };
  const click = async (sel) => {
    await page.waitForSelector(sel, { visible: true });
    await page.$eval(sel, (el) => el.scrollIntoView({ block: "center", inline: "center" }));
    await sleep(120);
    await page.click(sel);
    await sleep(150);
  };
  const step = () => page.$eval(".sl-sheet[open] .sl-steps [aria-current=step] i", (el) => el.textContent.trim()).catch(() => null);
  const sheetOpen = () => page.evaluate(() => !!document.querySelector(".sl-sheet[open]"));
  const closeSheet = async () => {
    if (await sheetOpen()) {
      await page.evaluate(() => document.querySelector(".sl-sheet-x")?.click());
      await sleep(300);
    }
  };
  return { text, overflow, clickText, click, step, sheetOpen, closeSheet };
};

/** Размеры кнопок и ссылок первого экрана и нижней панели: цель касания не меньше 44 px. */
async function tinyTargets(page, scope) {
  return page.evaluate(
    (scope, min) =>
      [...document.querySelectorAll(`${scope} button, ${scope} a`)]
        .filter((e) => e.offsetParent !== null && getComputedStyle(e).visibility !== "hidden")
        .map((e) => ({ t: (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 20), r: e.getBoundingClientRect() }))
        .filter(({ r }) => r.height > 0 && (r.height < min - 0.5 || r.width < min - 0.5))
        .map(({ t, r }) => `${t}:${Math.round(r.width)}x${Math.round(r.height)}`),
    scope,
    MIN_TAP,
  );
}

/** Сценарий записи на одном бизнесе: возвращает имя гостя. */
async function bookingFlow(page, h, tag, style, vp) {
  const spec = SPEC[style];
  const mobile = vp.width < 700;
  await page.goto(`${BASE}/sites/salon/${style}`, { waitUntil: "networkidle0" });
  // Ждём гидрацию: «Открыто до…» заменяет нейтральные часы только в браузере.
  await page.waitForFunction(() => document.querySelector(".sl-status")?.dataset.state !== "idle", { timeout: 8000 }).catch(() => {});
  await sleep(500);
  check(`${tag} старт: нет горизонтального скролла`, (await h.overflow()) <= 0, String(await h.overflow()));
  // Мобильный Chrome молча уменьшает масштаб, если что-то шире экрана: тогда innerWidth больше ширины окна.
  check(`${tag} старт: страница не уменьшена масштабом (innerWidth = ${vp.width})`, (await page.evaluate(() => innerWidth)) === vp.width, String(await page.evaluate(() => innerWidth)));
  check(`${tag} бренд ${spec.brand} в шапке`, (await h.text(".sl-logo")).includes(spec.brand));

  // Первый экран: бренд, визуал и главное действие в пределах 100svh.
  const hero = await page.evaluate(() => {
    const cta = document.getElementById("hero-cta").getBoundingClientRect();
    const h1 = document.querySelector(".sl h1").getBoundingClientRect();
    const img = document.querySelector(".sl-hero-photo img").getBoundingClientRect();
    return { ctaBottom: cta.bottom, h1Top: h1.top, h1Bottom: h1.bottom, imgH: img.height, vh: innerHeight, ctaTop: cta.top };
  });
  check(`${tag} первый экран: кнопка «Записаться» целиком в 100svh`, hero.ctaBottom <= hero.vh, `${Math.round(hero.ctaBottom)} / ${hero.vh}`);
  check(`${tag} первый экран: заголовок виден, визуал занимает экран`, hero.h1Top >= 0 && hero.imgH > hero.vh * 0.4, JSON.stringify(hero));
  const barState = await page.evaluate(() => ({ headBook: getComputedStyle(document.querySelector(".sl-head-book")).visibility, bar: getComputedStyle(document.querySelector(".sl-bar")).visibility, barShown: getComputedStyle(document.querySelector(".sl-bar")).display }));
  check(`${tag} одна «Записаться» на экране: шапка и панель спрятаны`, barState.headBook === "hidden" && (barState.barShown === "none" || barState.bar === "hidden"), JSON.stringify(barState));
  const tiny = await tinyTargets(page, ".sl-hero");
  check(`${tag} первый экран: цели касания ≥ 44 px`, tiny.length === 0, tiny.join(", "));
  const fontMin = await page.evaluate(() => Math.min(...[...document.querySelectorAll(".sl-hero p, .sl-hero li, .sl-hero button, .sl-status")].filter((e) => e.offsetParent).map((e) => parseFloat(getComputedStyle(e).fontSize))));
  check(`${tag} первый экран: текст ≥ 12 px (мелкий только вспомогательный)`, fontMin >= 12, String(fontMin));

  // Лукбук: фильтр-чипы и «Записаться» у карточки с предвыбором.
  const total = await page.$$eval(".sl-look-item", (els) => els.length);
  await h.clickText(".sl-look .sl-chip", spec.filterChip);
  const filtered = await page.$$eval(".sl-look-item", (els) => els.length);
  check(`${tag} лукбук: фильтр «${spec.filterChip}» сужает ленту (${total} → ${filtered})`, filtered > 0 && filtered < total);
  await h.clickText(".sl-look .sl-chip", "Все");
  check(`${tag} лукбук: «Все» возвращает ленту`, (await page.$$eval(".sl-look-item", (els) => els.length)) === total);
  const lookName = await page.$eval(".sl-look-item figcaption b", (e) => e.textContent.trim());
  const lookSum = norm(await page.$eval(".sl-look-item figcaption span", (e) => e.textContent));
  await page.$eval(".sl-look-item .sl-look-book", (el) => el.scrollIntoView({ block: "center", inline: "center" }));
  await sleep(150);
  await page.click(".sl-look-item .sl-look-book");
  await page.waitForSelector(".sl-sheet[open]", { timeout: 10000 }).catch(() => {});
  await sleep(300);
  check(`${tag} карточка образа «${lookName}»: шторка открылась сразу на шаге 2`, (await h.sheetOpen()) && (await h.step()) === "2", String(await h.step()));
  const sumText = norm(await h.text(".sl-sum"));
  check(`${tag} образ: в сводке цена и время образа (${lookSum.split("·")[0].trim()})`, sumText.includes(lookSum.split("·")[0].trim()), sumText);
  if (mobile) {
    const box = await page.$eval(".sl-sheet", (e) => ({ h: e.getBoundingClientRect().height, vh: innerHeight, top: e.getBoundingClientRect().top }));
    check(`${tag} мобильная шторка на всю высоту`, Math.abs(box.h - box.vh) < 2 && box.top <= 1, JSON.stringify(box));
  }
  await h.closeSheet();

  // Подбор образа: два касания до результата, третье — «Записаться».
  await page.$eval("#quiz", (el) => el.scrollIntoView({ block: "start" }));
  await sleep(200);
  let taps = 0;
  await h.clickText(".sl-quiz-opt", spec.quiz[0]);
  taps++;
  await h.clickText(".sl-quiz-opt", spec.quiz[1]);
  taps++;
  await page.waitForSelector(".sl-quiz-result");
  const quizText = norm(await h.text(".sl-quiz-result"));
  check(`${tag} подбор: результат после ${taps} касаний, образ, цена и мастер`, taps <= 3 && spec.quizNames.test(quizText) && /сум/.test(quizText), quizText.slice(0, 140));
  check(`${tag} подбор: фокус на заголовке результата`, await page.evaluate(() => document.activeElement?.classList.contains("sl-quiz-q")));
  // Кнопку результата ведём в центр экрана: у низа её перекрыла бы нижняя панель телефона.
  await h.click(".sl-quiz-act .sl-btn");
  taps++;
  await page.waitForSelector(".sl-sheet[open]", { timeout: 10000 }).catch(() => {});
  await sleep(300);
  check(`${tag} подбор: ${taps} касания до шага 2 записи`, taps <= 3 && (await h.step()) === "2");
  await h.closeSheet();

  // Запись из hero: услуги → сумма нескольких услуг с пакетом.
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);
  await page.click("#hero-cta");
  await page.waitForSelector(".sl-sheet[open]", { timeout: 10000 }).catch(() => {});
  await sleep(300);
  check(`${tag} запись: шторка открылась на шаге 1`, (await h.step()) === "1", String(await h.step()));
  check(`${tag} запись: «Далее» заблокирована, пока нет услуг`, await page.$eval(".sl-next", (b) => b.disabled));
  for (const [group, name] of spec.pick) {
    await h.clickText(".sl-sheet .sl-chip[role=tab]", group);
    await h.clickText(".sl-sheet .sl-tile", name);
  }
  const sum = norm(await h.text(".sl-sum"));
  check(`${tag} сумма двух услуг со скидкой пакета: ${spec.pickTotal}`, spec.pickTotal.test(sum) && spec.pickFull.test(sum) && /выгода/.test(sum), sum);
  if (spec.incompatible) {
    await h.clickText(".sl-sheet .sl-chip[role=tab]", spec.incompatible[0]);
    const dim = await page.evaluate((name) => [...document.querySelectorAll(".sl-sheet .sl-tile")].find((t) => t.textContent.includes(name))?.dataset.dim === "true" || [...document.querySelectorAll(".sl-sheet .sl-tile")].find((t) => t.textContent.includes(name))?.hasAttribute("data-dim"), spec.incompatible[1]);
    check(`${tag} услуга другого мастера помечена «другой мастер»`, dim);
    await h.clickText(".sl-sheet .sl-tile", spec.incompatible[1]);
    check(`${tag} выбор не тупикует: набор заменён и подсказка показана`, /другой мастер|Another|boshqa/i.test(await h.text(".sl-sheet-body")) || (await page.$(".sl-hint")) !== null);
    // вернуть набор
    for (const [group, name] of spec.pick) {
      await h.clickText(".sl-sheet .sl-chip[role=tab]", group);
      const on = await page.evaluate((n) => [...document.querySelectorAll(".sl-sheet .sl-tile")].find((t) => t.textContent.includes(n))?.getAttribute("aria-pressed") === "true", name);
      if (!on) await h.clickText(".sl-sheet .sl-tile", name);
    }
  }
  const tinySheet = await tinyTargets(page, ".sl-sheet");
  check(`${tag} шторка шаг 1: цели касания ≥ 44 px`, tinySheet.length === 0, tinySheet.join(", "));
  await h.click(".sl-next");
  await sleep(300);
  check(`${tag} шаг 2: мастер и время`, (await h.step()) === "2");
  check(`${tag} шаг 2: индикатор показывает 3 шага`, (await page.$$eval(".sl-steps li", (l) => l.length)) === 3);

  // Фильтр времени суток.
  const partsOk = [];
  for (const [label, test] of [["Утро", (t) => t < "12:00"], ["День", (t) => t >= "12:00" && t < "17:00"], ["Вечер", (t) => t >= "17:00"]]) {
    await h.clickText(".sl-sheet .sl-chip", label);
    const times = await page.$$eval(".sl-slots button", (b) => b.map((x) => x.textContent.trim()));
    partsOk.push(`${label}:${times.length}`);
    check(`${tag} фильтр «${label}»: все окна подходят`, times.every(test), times.join(","));
  }
  await h.clickText(".sl-sheet .sl-chip", "Все");
  // День (не сегодня, если есть) и первое свободное окно.
  const days = await page.$$(".sl-days button:not([disabled])");
  const day = days[Math.min(1, days.length - 1)];
  await day.evaluate((e) => e.scrollIntoView({ block: "center", inline: "center" }));
  await day.click();
  await sleep(250);
  const slot = (await page.$$(".sl-slots button:not([disabled])"))[3];
  await slot.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await slot.click();
  await h.click(".sl-next");
  await sleep(300);
  check(`${tag} шаг 3: контакты`, (await h.step()) === "3");
  // Пустая отправка: ошибки на языке пользователя, фокус на первом поле.
  await page.click(".sl-next");
  await sleep(200);
  check(`${tag} шаг 3: пустая форма даёт ошибки и фокус на имени`, (await page.$$(".sl-err")).length >= 2 && (await page.evaluate(() => document.activeElement?.id)) === "sl-name");
  await page.type("#sl-name", spec.guest);
  await page.type("#sl-phone", "+998901112233");
  await h.clickText(".sl-sheet .sl-chip", spec.perk);
  await page.click(".sl-next");
  await page.waitForSelector(".sl-success");
  await sleep(200);
  const success = norm(await h.text(".sl-success"));
  check(`${tag} успех: услуги, сумма пакета`, spec.pickTotal.test(success) && success.includes(spec.pick[0][1]), success.slice(0, 160));
  check(`${tag} успех: фокус на заголовке`, await page.evaluate(() => document.activeElement?.tagName === "H2"));
  const tgHref = await page.$eval(".sl-success a.sl-btn", (a) => a.href);
  const tgOk = tgHref.startsWith(style === "a" ? "https://t.me/ustara_demo?text=" : "https://t.me/nafis_demo?text=") && decodeURIComponent(tgHref).includes(spec.perk);
  check(`${tag} ссылка Telegram с текстом и угощением`, tgOk, decodeURIComponent(tgHref).slice(0, 140));
  check(`${tag} после записи: нет горизонтального скролла`, (await h.overflow()) <= 0);
  await h.closeSheet();
  return spec.guest;
}

for (const vp of VIEWPORTS) {
  const { ctx, page, errors } = await openPage(vp);
  const h = helpers(page);
  const mobile = vp.width < 700;
  const guests = {};
  for (const style of STYLES) {
    const tag = `${vp.name}/${style}`;
    try {
      guests[style] = await bookingFlow(page, h, tag, style, vp);
    } catch (e) {
      check(`${tag} сценарий записи не упал`, false, e.message);
    }
  }

  // Кабинет: открывается на бизнесе, который смотрели последним; запись видна только у своего бизнеса.
  const last = STYLES[STYLES.length - 1];
  try {
    await page.goto(`${BASE}/sites/salon/admin`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".adm-switch");
    await page.waitForFunction(() => !document.querySelector(".adm-skel"), { timeout: 8000 }).catch(() => {});
    await sleep(400);
    const pressed = () => page.$eval(".adm-switch [aria-pressed=true]", (e) => e.textContent.trim());
    const tag = `${vp.name}/admin`;
    check(`${tag} открылся на последнем бизнесе (${SPEC[last].business})`, (await pressed()) === SPEC[last].business, await pressed());
    check(`${tag} в шапке нет горизонтального скролла`, (await h.overflow()) <= 0, String(await h.overflow()));
    for (const style of STYLES) {
      if ((await pressed()) !== SPEC[style].business) await h.clickText(".adm-switch button", SPEC[style].business);
      await sleep(300);
      await page.waitForFunction(() => !document.querySelector(".adm-skel"), { timeout: 8000 }).catch(() => {});
      await h.clickText(".adm-tabs button", "Записи");
      await sleep(300);
      const main = norm(await h.text(".adm-main"));
      const other = STYLES.find((s) => s !== style);
      check(`${tag} ${SPEC[style].business}: видна запись «${guests[style]}»`, main.includes(guests[style]) && /с сайта/.test(main), main.slice(0, 100));
      if (other) check(`${tag} ${SPEC[style].business}: чужой записи «${guests[other]}» нет`, !main.includes(guests[other]));
      check(`${tag} ${SPEC[style].business}: нет горизонтального скролла`, (await h.overflow()) <= 0, String(await h.overflow()));
      const brand = norm(await h.text(".adm-name"));
      check(`${tag} название в шапке: ${brand}`, brand.includes(SPEC[style].brand));
    }
    if (SHOTS && ["1440"].includes(vp.name)) {
      for (const style of STYLES) {
        await h.clickText(".adm-switch button", SPEC[style].business);
        await h.clickText(".adm-tabs button", "Обзор");
        await sleep(500);
        await page.screenshot({ path: `${OUT}/salon2-admin-${style}-1440.png` });
      }
    }
  } catch (e) {
    check(`${vp.name}/admin: сценарий кабинета не упал`, false, e.message);
  }

  // Выходной мастера, правка цены и скидки пакета — на каждом бизнесе.
  for (const style of STYLES) {
    const spec = SPEC[style];
    const tag = `${vp.name}/${style}`;
    try {
      await page.goto(`${BASE}/sites/salon/admin`, { waitUntil: "networkidle0" });
      await page.waitForSelector(".adm-switch");
      await page.waitForFunction(() => !document.querySelector(".adm-skel"), { timeout: 8000 }).catch(() => {});
      await h.clickText(".adm-switch button", spec.business);
      await sleep(300);
      await page.waitForFunction(() => !document.querySelector(".adm-skel"), { timeout: 8000 }).catch(() => {});
      // Выходной первого мастера на все дни.
      await h.clickText(".adm-tabs button", "Мастера и график");
      const doc = (await page.$$(".adm-doc"))[0];
      for (const b of await doc.$$(".adm-days button[aria-pressed=true]")) await b.click();
      check(`${tag} кабинет: предупреждение «нет приёма»`, /окон на сайте нет/.test(await h.text(".adm-docs")));
      // Цена первой услуги и скидка первого пакета.
      await h.clickText(".adm-tabs button", "Услуги и цены");
      const item = (await page.$$(".adm-item"))[0];
      await (await item.$(".adm-price")).click();
      await page.$eval(".adm-price-input", (e) => e.select());
      await page.keyboard.type(spec.priceNew);
      await page.keyboard.press("Enter");
      await sleep(250);
      const priceText = norm(await item.$eval(".adm-price", (e) => e.textContent));
      check(`${tag} кабинет: цена первой услуги ${spec.priceNew}`, spec.priceShown.test(priceText), priceText);
      const pack = (await page.$$(".adm-items[data-kind=packages] .adm-item"))[0];
      check(`${tag} кабинет: пакеты есть в «Услуги и цены»`, !!pack);
      await (await pack.$(".adm-price")).click();
      await page.$eval(".adm-price-input", (e) => e.select());
      await page.keyboard.type("20");
      await page.keyboard.press("Enter");
      await sleep(250);
      if (SHOTS && vp.name === "1440" && style === "a") await page.screenshot({ path: `${OUT}/salon2-admin-a-services-1440.png` });

      // Сайт: цена, скидка, мастер без приёма.
      await page.goto(`${BASE}/sites/salon/${style}`, { waitUntil: "networkidle0" });
      await sleep(900);
      const tileText = norm(await page.evaluate((n) => [...document.querySelectorAll(".sl-services .sl-tile")].find((t) => t.textContent.includes(n))?.textContent ?? "", spec.priceTile));
      check(`${tag} сайт: цена «${spec.priceTile}» ${spec.priceNew}`, spec.priceShown.test(tileText), tileText);
      const packText = norm(await page.$eval(".sl-services .sl-pack", (e) => e.textContent));
      check(`${tag} сайт: скидка пакета −20%`, /20%/.test(packText), packText);
      const masterText = norm(await page.$eval(".sl-master", (e) => e.textContent));
      check(`${tag} сайт: мастер «${spec.offMaster}» без приёма`, masterText.includes(spec.offMaster) && /без приёма/.test(masterText), masterText);
      const disabled = await page.$eval(".sl-master .sl-btn", (b) => b.disabled);
      check(`${tag} сайт: кнопка записи к мастеру без приёма недоступна`, disabled);
      check(`${tag} сайт: нет горизонтального скролла`, (await h.overflow()) <= 0, String(await h.overflow()));
    } catch (e) {
      check(`${tag} кабинет → сайт: сценарий не упал`, false, e.message);
    }
  }

  check(`${vp.name} консоль и сеть без ошибок`, errors.length === 0, errors.join(" | "));
  await ctx.close();
  void mobile;
}

// Другие языки: страница открывается без горизонтального скролла и ошибок (узбекский с ʻ).
for (const style of STYLES) {
  for (const loc of ["en", "uz"]) {
    const { ctx, page, errors } = await openPage(ALL_VIEWPORTS[1]);
    await page.goto(`${BASE}/${loc}/sites/salon/${style}`, { waitUntil: "networkidle0" });
    await sleep(700);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`390/${style}/${loc}: открылась, нет горизонтального скролла и ошибок`, ov <= 0 && errors.length === 0, `${ov} ${errors.join("|")}`);
    await page.click("#hero-cta");
    await sleep(500);
    check(`390/${style}/${loc}: шторка записи открывается`, await page.evaluate(() => !!document.querySelector(".sl-sheet[open]")));
    await ctx.close();
  }
}

// Скриншоты: герой и вся страница (390 и 1440), шторка записи (390). Для «full» движение выключено и картинки загружены.
if (SHOTS) {
  for (const style of STYLES) {
    for (const vp of [ALL_VIEWPORTS[1], ALL_VIEWPORTS[3]]) {
      const { ctx, page } = await openPage(vp);
      await page.goto(`${BASE}/sites/salon/${style}`, { waitUntil: "networkidle0" });
      await sleep(1600);
      await page.screenshot({ path: `${OUT}/salon2-${style}-hero-${vp.name}.png` });
      if (vp.name === "390") {
        await page.click("#hero-cta");
        await sleep(600);
        for (const [g, n] of SPEC[style].pick) {
          await page.evaluate((g) => [...document.querySelectorAll(".sl-sheet .sl-chip[role=tab]")].find((c) => c.textContent.includes(g))?.click(), g);
          await sleep(150);
          await page.evaluate((n) => [...document.querySelectorAll(".sl-sheet .sl-tile")].find((t) => t.textContent.includes(n))?.click(), n);
          await sleep(150);
        }
        await page.screenshot({ path: `${OUT}/salon2-${style}-booking-390.png` });
      }
      await ctx.close();
      const full = await openPage(vp, true);
      await full.page.goto(`${BASE}/sites/salon/${style}`, { waitUntil: "networkidle0" });
      await full.page.evaluate(async () => {
        document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
        await Promise.race([Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => (i.onload = i.onerror = r))))), new Promise((r) => setTimeout(r, 5000))]);
      });
      await sleep(500);
      await full.page.screenshot({ path: `${OUT}/salon2-${style}-full-${vp.name}.png`, fullPage: true });
      await full.ctx.close();
    }
  }
}

await Promise.race([browser.close(), sleep(5000)]);
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "OK  " : "FAIL"} ${r.name}${r.ok ? "" : " — " + r.extra}`);
console.log(failed.length ? `\nПРОВАЛЕНО: ${failed.length} из ${results.length}` : `\nВсе ${results.length} проверок пройдены`);
process.exit(failed.length ? 1 : 0);
