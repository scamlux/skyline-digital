// Сквозной сценарий шаблона «Ресторан»: набор на 4 гостей → «прийти на это» → бронь в три шага
// (повод, зона, дата, вечернее время, контакты) → ссылка Telegram → кабинет видит заявку с зоной и поводом →
// стоп-лист, правка цены, часы, акция и скидка набора → сайт всё это показывает.
// Chrome — локальный (puppeteer-core), Playwright/Chromium не ставим.
// Запуск: node scripts/qa/restaurant-flow.mjs [style=a|b|both] ; BASE=http://localhost:3104 ; SHOTS=<папка скриншотов>
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3104";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SHOTS = process.env.SHOTS || path.resolve("screenshots");
const arg = process.argv[2] || "both";
const STYLES = arg === "both" ? ["a", "b"] : [arg];
const VIEWPORTS = [
  { name: "360", width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "430", width: 430, height: 932, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "1440", width: 1440, height: 900 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok: !!ok, extra });
  if (!ok) console.log(`  ✗ ${name} ${extra}`);
};

/** Клик через DOM по элементу селектора (опционально с нужным текстом): не мешает липкая панель. */
const click = (page, selector, text) =>
  page.evaluate(
    (sel, txt) => {
      const el = [...document.querySelectorAll(sel)].find((e) => !txt || e.textContent.replace(/\s+/g, " ").includes(txt));
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    text,
  );
const exists = (page, selector) => page.evaluate((s) => !!document.querySelector(s), selector);
const text = (page, selector) => page.evaluate((s) => document.querySelector(s)?.textContent ?? "", selector);
const allText = (page, selector) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.replace(/\s+/g, " ").trim()), selector);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
/** Значение в React-управляемое поле (type=time, number, text) через родной сеттер и событие input. */
const setValue = (page, selector, value) =>
  page.evaluate(
    (sel, v) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    },
    selector,
    value,
  );
async function scrollTo(page, selector) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), selector);
  await sleep(350);
}
async function revealAll(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 420) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(110);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
}

for (const style of STYLES) {
  for (const vp of VIEWPORTS) {
    const tag = `[${style} ${vp.name}]`;
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport(vp);
    const errors = [];
    const bad404 = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      // Статус ресурса разбираем по событию response (там есть адрес); сообщение о нём в консоли пропускаем.
      if (/Failed to load resource/.test(t)) return;
      // Тот же скрипт Vercel Analytics: локально его нет, браузер ругается на тип ответа.
      if (/_vercel\/insights/.test(t)) return;
      errors.push(t);
    });
    page.on("response", (r) => {
      const url = r.url();
      // Скрипт Vercel Analytics существует только на Vercel; локально он отдаёт 404 — не ошибка шаблона.
      if (r.status() >= 400 && !/_vercel\/insights/.test(url) && url.startsWith(BASE)) bad404.push(`${r.status()} ${url}`);
    });
    const shot = (name) => page.screenshot({ path: path.join(SHOTS, name) });
    const big = vp.name === "390" || vp.name === "1440";
    const site = `${BASE}/sites/restaurant/${style}`;

    // 1. Первый экран.
    await page.goto(site, { waitUntil: "networkidle0" });
    await sleep(900);
    if (big) await shot(`restaurant2-${style}-hero-${vp.name}.png`);
    const heroBox = await page.evaluate(() => {
      const h1 = document.querySelector(".rs-hero h1")?.getBoundingClientRect();
      const cta = document.querySelector(".rs-hero .rs-cta")?.getBoundingClientRect();
      return { h1: h1 ? h1.height : 0, ctaBottom: cta ? cta.bottom : 9999, ctaH: cta ? cta.height : 0, vh: window.innerHeight };
    });
    check(`${tag} первый экран: CTA «Забронировать стол» в пределах экрана`, heroBox.ctaBottom <= heroBox.vh, JSON.stringify(heroBox));
    check(`${tag} CTA ≥ 44px`, heroBox.ctaH >= 44);
    check(`${tag} заголовок h1 не длиннее трёх строк`, heroBox.h1 > 0 && heroBox.h1 < (vp.width < 700 ? 64 * 3.2 : 100 * 3.2), `h=${heroBox.h1}`);
    if (big) {
      // Полная страница: секции с content-visibility в снимке по умолчанию не рисуются — включаем на момент съёмки.
      await revealAll(page);
      await page.addStyleTag({ content: ".rs-menu,.rs-setb,.rs-delivery,.rs-reviews,.rs-contacts{content-visibility:visible!important}" });
      await sleep(500);
      await page.screenshot({ path: path.join(SHOTS, `restaurant2-${style}-full-${vp.name}.png`), fullPage: true });
    }
    check(`${tag} нет горизонтального скролла (сайт)`, (await overflow(page)) <= 0, `overflow=${await overflow(page)}`);

    // 2. Мобильная липкая панель появляется после первого экрана.
    if (vp.width < 861) {
      await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.4));
      await sleep(600);
      const stickyShown = await page.evaluate(() => {
        const el = document.querySelector(".rs-sticky");
        return !!el && !el.hasAttribute("data-hidden") && el.getBoundingClientRect().bottom <= window.innerHeight + 1;
      });
      check(`${tag} липкая панель видна после первого экрана`, stickyShown);
    }

    // 3. Меню: фильтр «Острое» оставляет только острое.
    await scrollTo(page, "#menu");
    check(`${tag} в меню 13 карточек`, (await page.evaluate(() => document.querySelectorAll(".rs-dish").length)) === 13);
    await click(page, ".rs-filters button.tag", "Остр");
    await sleep(200);
    const spicy = await page.evaluate(() => document.querySelectorAll(".rs-dish").length);
    check(`${tag} фильтр «Острое»: 2 блюда`, spicy === 2, `n=${spicy}`);
    await click(page, ".rs-filters button.tag", "Остр");
    await sleep(150);

    // 4. Конструктор набора: 4 гостя → «Прийти на это».
    await scrollTo(page, "#company");
    const guests4 = await page.evaluate(() => document.querySelector(".rs-guests output")?.dataset.guests);
    check(`${tag} набор по умолчанию на 4 гостей`, guests4 === "4", `g=${guests4}`);
    await click(page, ".rs-quick button", "6");
    await sleep(150);
    const lines6 = await page.evaluate(() => [...document.querySelectorAll(".rs-line")].map((l) => l.querySelector("b").textContent + ":" + l.querySelector(".rs-stepper > b").textContent).join("|"));
    check(`${tag} на 6 гостей плов ×6`, /Плов праздничный:6/.test(lines6), lines6);
    await click(page, ".rs-quick button", "4");
    await sleep(150);
    const total4 = await page.evaluate(() => document.querySelector(".rs-total .all dd")?.textContent.replace(/\s/g, "") ?? "");
    check(`${tag} итог набора на 4 гостей = 335 000 сум`, /335000сум/.test(total4), total4);
    // Правка количества: чай +1, итог растёт на 12 000 − скидка.
    await click(page, '.rs-line button[aria-label^="Добавить: Чай"]');
    await sleep(150);
    const total4b = await page.evaluate(() => document.querySelector(".rs-total .all dd")?.textContent.replace(/\s/g, "") ?? "");
    check(`${tag} +1 чай меняет итог`, total4b !== total4, total4b);
    await click(page, '.rs-line button[aria-label^="Убавить: Чай"]');
    await sleep(150);
    await click(page, ".rs-setb-sum .rs-cta");
    await sleep(500);
    check(`${tag} окно брони открыто`, await exists(page, "dialog.rs-sheet[open]"));
    check(`${tag} гости из набора: чип «3–4», предзаказ в сводке`, (await exists(page, '[data-party="3–4"][aria-checked="true"]')) && (await exists(page, "[data-wish]")));
    check(`${tag} в сводке точное число «4 гостя»`, /4 гост/.test(await text(page, "[data-summary]")));

    // 5. Бронь: повод, зона, дата, вечер, время.
    await click(page, '[data-occasion="birthday"]');
    if (big) await shot(`restaurant2-${style}-booking-${vp.name}-step1.png`);
    await click(page, "[data-next]");
    await sleep(350);
    const dates = await page.evaluate(() => document.querySelectorAll("[data-date]").length);
    check(`${tag} есть даты с местами`, dates >= 1, `n=${dates}`);
    if (dates > 1) await click(page, "[data-date]:nth-child(2)");
    await sleep(250);
    let zoneUsed = null;
    for (const z of ["tapchan", "hall"]) {
      await click(page, `[data-zone="${z}"]`);
      await sleep(200);
      await click(page, '[data-part="evening"]');
      await sleep(200);
      if (await exists(page, '[data-time][data-status="free"]')) {
        zoneUsed = z;
        break;
      }
    }
    check(`${tag} найден свободный вечерний слот`, !!zoneUsed);
    const times = await allText(page, "[data-time]");
    check(`${tag} фильтр «Вечер»: все слоты с 17:00`, times.length > 0 && times.every((x) => x >= "17:00"), times.join(","));
    await click(page, '[data-time][data-status="free"]');
    await sleep(250);
    if (vp.name === "390") await shot(`restaurant2-${style}-booking-390.png`);
    if (vp.name === "1440") await shot(`restaurant2-${style}-booking-1440.png`);
    const pickedTime = await page.evaluate(() => document.querySelector('[data-time][aria-checked="true"]')?.dataset.time ?? "");
    check(`${tag} время выбрано`, /^\d{2}:\d{2}$/.test(pickedTime), pickedTime);
    await click(page, "[data-next]");
    await sleep(350);

    // 6. Контакты и отправка.
    await page.type('input[name="name"]', "Тест QA");
    await page.type('input[name="phone"]', "+998 90 123 45 67");
    check(`${tag} sheet не даёт горизонтального скролла`, (await overflow(page)) <= 0);
    await click(page, "[data-submit]");
    await sleep(500);
    check(`${tag} экран «Заявка принята»`, await exists(page, ".rs-done [data-tg-link]"));
    const href = await page.evaluate(() => document.querySelector("[data-tg-link]")?.getAttribute("href") ?? "");
    const tgText = decodeURIComponent(href.split("text=")[1] ?? "");
    check(`${tag} Telegram-ссылка ведёт на чат ресторана`, href.startsWith("https://t.me/dasturxon_demo?text="), href.slice(0, 50));
    const zoneRu = zoneUsed === "tapchan" ? "Тапчан" : "Зал";
    check(`${tag} в сообщении зона, повод, время и предзаказ`, tgText.includes(zoneRu) && tgText.includes("День рождения") && tgText.includes(pickedTime) && tgText.includes("Классика"), tgText.replace(/\n/g, " / "));
    const popupP = new Promise((res) => browser.once("targetcreated", res));
    await click(page, "[data-tg-link]");
    const target = await Promise.race([popupP, sleep(4000).then(() => null)]);
    check(`${tag} ссылка Telegram открывается в новой вкладке`, !!target);
    if (target) {
      await sleep(600);
      const p2 = await target.page().catch(() => null);
      await p2?.close().catch(() => {});
    }
    if (big && vp.name === "390") await shot(`restaurant2-${style}-done-390.png`);
    await click(page, ".rs-done .rs-ghost");
    await sleep(350);
    check(`${tag} окно закрыто`, !(await exists(page, "dialog.rs-sheet[open]")));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("skyline-demo-restaurant-v1") || "{}"));
    const mine = stored.leads?.find((l) => l.name === "Тест QA");
    check(`${tag} заявка в сторе: зона, повод, предзаказ`, mine && mine.zone === zoneUsed && mine.occasion === "birthday" && /Классика/.test(mine.wish ?? "") && mine.guests === "4", JSON.stringify(mine));

    // 7. Кабинет: заявка видна с зоной и поводом.
    await page.goto(`${BASE}/sites/restaurant/admin`, { waitUntil: "networkidle0" });
    await sleep(900);
    if (vp.name === "1440" && style === "a") await shot("restaurant2-admin-overview-1440.png");
    await click(page, ".adm-tabs button", "Заявки");
    await sleep(350);
    const leadsText = await allText(page, ".adm-lead");
    const row = leadsText.find((x) => x.includes("Тест QA")) ?? "";
    check(`${tag} кабинет: заявка с зоной и поводом`, row.includes(zoneRu) && row.includes("День рождения") && row.includes("Заранее"), row);
    if (style === "a" && big) await shot(`restaurant2-admin-${vp.name}.png`);
    check(`${tag} нет горизонтального скролла (кабинет)`, (await overflow(page)) <= 0, `overflow=${await overflow(page)}`);

    // 8. Кабинет: стоп-лист (самса — в наборе «Классика»), цена плова, скидка набора, акция, часы.
    await click(page, ".adm-tabs button", "Меню и цены");
    await sleep(350);
    await click(page, '.adm-item[data-id="samsa"] .adm-toggle');
    await click(page, '.adm-item[data-id="plov"] .adm-price');
    await sleep(150);
    await setValue(page, ".adm-price-input", "70000");
    await page.keyboard.press("Enter");
    await sleep(200);
    await click(page, '[data-set="classic"] .adm-set-items label', "Ачичук");
    await page.focus('[data-set="classic"] .adm-pct input');
    await setValue(page, '[data-set="classic"] .adm-pct input', "20");
    await page.evaluate(() => document.querySelector('[data-set="classic"] .adm-pct input').blur());
    await click(page, '[data-set="light"] .adm-toggle');
    await sleep(250);
    if (style === "a" && vp.name === "1440") await shot("restaurant2-admin-menu-1440.png");
    if (style === "a" && vp.name === "390") await shot("restaurant2-admin-menu-390.png");
    await click(page, ".adm-tabs button", "Часы и акция");
    await sleep(300);
    await setValue(page, 'input[type="time"]:nth-of-type(1)', "09:00");
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="time"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(inputs[0], "09:00");
      inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
      setter.call(inputs[1], "22:00");
      inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    });
    await sleep(200);
    await setValue(page, ".adm-field input", "Скидка 15% на плов по четвергам");
    await sleep(250);

    // 9. Сайт отражает правки.
    await page.goto(site, { waitUntil: "networkidle0" });
    await sleep(900);
    const promo = await text(page, ".rs-promo");
    check(`${tag} сайт: текст акции из кабинета`, /Скидка 15%/.test(promo), promo);
    const dishes = await page.evaluate(() => [...document.querySelectorAll(".rs-dish")].map((d) => ({ n: d.querySelector("h3").textContent, out: d.hasAttribute("data-out"), p: d.querySelector(".rs-dish-price").textContent.replace(/\s/g, "") })));
    const samsa = dishes.find((d) => d.n.startsWith("Самса"));
    const plov = dishes.find((d) => d.n.startsWith("Плов"));
    check(`${tag} сайт: самса в стоп-листе`, samsa?.out === true);
    check(`${tag} сайт: цена плова 70 000`, plov?.p === "70000сум", plov?.p);
    const status = await text(page, ".rs-hero .rs-status");
    check(`${tag} сайт: часы из кабинета (22:00 или 09:00)`, /22:00|09:00/.test(status), status);
    await scrollTo(page, "#company");
    const setNames = await allText(page, ".rs-setcard b");
    check(`${tag} сайт: набор «Без мяса» выключен`, !setNames.some((n) => n.includes("Без мяса")), setNames.join(","));
    const lines = await allText(page, ".rs-line b:first-child");
    check(`${tag} сайт: самса и ачичук убраны из набора «Классика»`, !lines.some((n) => n.startsWith("Самса") || n.startsWith("Ачичук")), lines.join(","));
    const disc = await text(page, ".rs-total .off dt");
    check(`${tag} сайт: скидка набора 20%`, /20%/.test(disc), disc);
    // 4 гостя: плов ×4 по 70 000 + лепёшка ×2 + чай ×2 = 320 000, скидка 20% = 64 000, итого 256 000.
    const total = await page.evaluate(() => document.querySelector(".rs-total .all dd")?.textContent.replace(/\s/g, "") ?? "");
    check(`${tag} сайт: итог набора с правками = 256 000`, /256000сум/.test(total), total);
    check(`${tag} нет горизонтального скролла после правок`, (await overflow(page)) <= 0);

    check(`${tag} 0 ошибок консоли`, errors.length === 0, errors.join(" | "));
    check(`${tag} 0 ответов 404/5xx`, bad404.length === 0, bad404.join(" | "));
    await ctx.close();
    console.log(`${tag} готово`);
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\nПроверок: ${results.length}, провалено: ${failed.length}`);
for (const f of failed) console.log(` ✗ ${f.name} ${f.extra}`);
process.exit(failed.length ? 1 : 0);
