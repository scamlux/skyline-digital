// Сквозной сценарий шаблона «Салон»: подбор образа → запись → кабинет → выходной мастера и цена → сайт.
// Chrome — локальный (puppeteer-core), Playwright/Chromium не ставим.
// Запуск: node scripts/qa/salon-flow.mjs [style=a] ; BASE=http://localhost:3102 ; OUT=<папка для скриншотов кабинета>
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3102";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.env.OUT || "/tmp/salon-shots";
const style = process.argv[2] || "a";
const VIEWPORTS = [
  { name: "360", width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "1440", width: 1440, height: 900 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
const results = [];
const check = (name, ok, extra = "") => results.push({ name, ok: !!ok, extra });

for (const vp of VIEWPORTS) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(vp);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/_vercel|status of 404/.test(m.text()) && errors.push(m.text()));
  const tag = `${vp.name}/${style}`;
  const text = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\u00a0/g, " ").trim());
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const click = async (sel) => {
    await page.waitForSelector(sel, { visible: true });
    await page.$eval(sel, (el) => el.scrollIntoView({ block: "center" }));
    await sleep(150);
    await page.click(sel);
  };
  const clickText = async (selector, label) => {
    const handle = await page.evaluateHandle((selector, label) => [...document.querySelectorAll(selector)].find((e) => e.textContent.includes(label)), selector, label);
    const el = handle.asElement();
    if (!el) throw new Error(`нет ${selector} «${label}»`);
    await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
    await sleep(150);
    await el.click();
  };

  await page.goto(`${BASE}/sites/salon/${style}`, { waitUntil: "networkidle0" });
  await sleep(1200);
  check(`${tag} старт: нет горизонтального скролла`, (await overflow()) <= 0, String(await overflow()));

  // 1. Подбор образа: мужской → смело → с бородой.
  await clickText(".sl-quiz-opt", "Мужской");
  await clickText(".sl-quiz-opt", "Смело");
  await clickText(".sl-quiz-opt", "С бородой");
  await page.waitForSelector(".sl-quiz-result");
  const quizText = await text(".sl-quiz-result");
  check(`${tag} подбор: образ, цена и мастер`, /Борода/.test(quizText) && /190 000/.test(quizText) && /Рустам/.test(quizText), quizText.slice(0, 120));
  check(`${tag} подбор: фокус на заголовке результата`, await page.evaluate(() => document.activeElement?.classList.contains("sl-quiz-q")));
  await click(".sl-quiz-act .sl-btn");
  await sleep(900);

  // 2. Форма заполнена: фейд + борода, мастер Рустам, сумма 190 000.
  const basket1 = await text(".sl-basket");
  check(`${tag} форма подхватила образ`, /190 000/.test(basket1) && /1 ч 30 мин/.test(basket1), basket1);
  // 3. Добавляем вторую услугу — сумма пересчитывается.
  await clickText(".sl-chk", "Уход за лицом");
  const basket2 = await text(".sl-basket");
  check(`${tag} вторая услуга: 250 000 · 1 ч 50 мин`, /250 000/.test(basket2) && /1 ч 50 мин/.test(basket2), basket2);
  await clickText(".sl-chk", "Уход за лицом"); // назад к фейд + борода

  // 4. Мастер уже выбран из подбора; день и время.
  const masterChecked = await page.$$eval(".sl-radio input", (els) => els.map((e) => e.checked));
  check(`${tag} мастер Рустам выбран`, masterChecked[1] === true, JSON.stringify(masterChecked));
  const days = await page.$$(".sl-days button:not([disabled])");
  const dayBtn = days[Math.min(1, days.length - 1)];
  await dayBtn.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await dayBtn.click();
  await sleep(200);
  const slotBtn = (await page.$$(".sl-slots button:not([disabled])"))[3];
  await slotBtn.click();
  await page.type("#sl-name", "Тест Демо");
  await page.type("#sl-phone", "+998901112233");
  await page.click(".sl-form .sl-btn.big");
  await page.waitForSelector(".sl-success");
  await sleep(200);
  const success = await text(".sl-success");
  check(`${tag} успех: услуги, мастер, сумма`, /Фейд \+ Оформление бороды/.test(success) && /Рустам/.test(success) && /190 000/.test(success), success.slice(0, 160));
  check(`${tag} успех: фокус на заголовке`, await page.evaluate(() => document.activeElement?.tagName === "H3"));
  const tgHref = await page.$eval(".sl-success a.sl-btn", (a) => a.href);
  check(`${tag} ссылка Telegram с текстом`, tgHref.startsWith("https://t.me/ustara_demo?text=") && decodeURIComponent(tgHref).includes("Рустам Алиев"), decodeURIComponent(tgHref).slice(0, 140));
  check(`${tag} после записи: нет горизонтального скролла`, (await overflow()) <= 0);

  // 5. Кабинет: запись видна.
  await page.goto(`${BASE}/sites/salon/admin`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".adm-tabs");
  await sleep(600);
  await clickText(".adm-tabs button", "Записи");
  await sleep(300);
  await page.waitForFunction(() => !document.querySelector(".adm-skel"), { timeout: 5000 }).catch(() => {});
  const adminBookings = await text(".adm-main");
  check(`${tag} кабинет: запись «Тест Демо» с сайта`, /Тест Демо/.test(adminBookings) && /с сайта/.test(adminBookings) && /190 000/.test(adminBookings));
  if (vp.name !== "360") await page.screenshot({ path: `${OUT}/salon-admin-bookings-${vp.name}.png` });
  check(`${tag} кабинет: нет горизонтального скролла`, (await overflow()) <= 0, String(await overflow()));
  // Статус: подтвердить.
  await clickText(".adm-lead .adm-link", "Подтвердить");
  await sleep(150);

  // 6. Выходной мастера и правка цены.
  await clickText(".adm-tabs button", "Мастера и график");
  // 6a. Выходной Рустама на ОДИН день (завтра): чип этого дня недоступен, другие дни и окна остаются.
  const todayWd = await page.evaluate(() => (new Date(Date.now() + 5 * 3600e3).getUTCDay() + 6) % 7);
  const tomorrowWd = (todayWd + 1) % 7;
  const rustam = (await page.$$(".adm-doc"))[0];
  const dayButtons = await rustam.$$(".adm-days button");
  const wasWorking = await dayButtons[tomorrowWd].evaluate((b) => b.getAttribute("aria-pressed") === "true");
  if (wasWorking) await dayButtons[tomorrowWd].click();
  await page.goto(`${BASE}/sites/salon/${style}`, { waitUntil: "networkidle0" });
  await sleep(900);
  await clickText(".sl-radio", "Рустам");
  const chips = await page.$$eval(".sl-days button", (els) => els.map((e) => e.disabled));
  const slotsOtherDay = await page.$$eval(".sl-slots button:not([disabled])", (els) => els.length);
  check(`${tag} выходной на один день: чип «завтра» недоступен, другие дни работают`, chips[1] === true && chips.some((d) => d === false) && slotsOtherDay > 0, JSON.stringify(chips) + " free=" + slotsOtherDay);
  await page.goto(`${BASE}/sites/salon/admin`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.querySelector(".adm-skel"), { timeout: 5000 }).catch(() => {});
  await clickText(".adm-tabs button", "Мастера и график");
  if (wasWorking) await (await (await page.$$(".adm-doc"))[0].$$(".adm-days button"))[tomorrowWd].click();
  // 6b. Выходной Рустама на все дни — «любой» подберёт Жасура, а у Рустама окон нет.
  const rustamCard = (await page.$$(".adm-doc"))[0];
  for (const b of await rustamCard.$$(".adm-days button[aria-pressed=true]")) await b.click();
  check(`${tag} кабинет: предупреждение «нет приёма»`, /окон на сайте нет/.test(await text(".adm-docs")));
  await clickText(".adm-tabs button", "Услуги и цены");
  const priceBtn = (await page.$$(".adm-item"))[1]; // Фейд
  await (await priceBtn.$(".adm-price")).click();
  await page.$eval(".adm-price-input", (e) => e.select());
  await page.keyboard.type("150000");
  await page.keyboard.press("Enter");
  await sleep(300);
  const priceText = (await priceBtn.$eval(".adm-price", (e) => e.textContent)).replace(/\u00a0/g, " ");
  check(`${tag} кабинет: цена фейда 150 000`, /150 000/.test(priceText), priceText);
  await page.screenshot({ path: `${OUT}/salon-admin-services-${vp.name}.png` }).catch(() => {});

  // 7. Возврат на сайт: цена обновилась, окна Рустама нет.
  await page.goto(`${BASE}/sites/salon/${style}`, { waitUntil: "networkidle0" });
  await sleep(900);
  await clickText(".sl-tabs button", "Мужской зал");
  const priceRow = (await page.evaluate(() => [...document.querySelectorAll(".sl-price-row")].map((r) => r.textContent).find((t) => t.includes("Фейд")))).replace(/\u00a0/g, " ");
  check(`${tag} сайт: цена фейда 150 000`, /150 000/.test(priceRow ?? ""), priceRow ?? "нет строки");
  const masters = await page.$$eval(".sl-master", (els) => els.map((e) => e.textContent));
  check(`${tag} сайт: у Рустама нет ближайшего окна`, /Нет окон/.test(masters[0]) && !/Нет окон/.test(masters[1]), masters.map((m) => m.slice(0, 80)).join(" | "));
  const radios = await page.$$eval(".sl-radio", (els) => els.map((e) => ({ t: e.textContent, d: e.querySelector("input").disabled })));
  check(`${tag} сайт: Рустам в форме недоступен`, radios.find((r) => r.t.includes("Рустам"))?.d === true, JSON.stringify(radios.map((r) => r.d)));
  // Окно «Тест Демо» занято: тот же слот Рустама недоступен, но запись «любой» не выбирает Рустама.
  check(`${tag} сайт: нет горизонтального скролла`, (await overflow()) <= 0, String(await overflow()));
  check(`${tag} консоль без ошибок`, errors.length === 0, errors.join(" | "));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "OK  " : "FAIL"} ${r.name}${r.ok ? "" : " — " + r.extra}`);
console.log(failed.length ? `\nПРОВАЛЕНО: ${failed.length}` : `\nВсе ${results.length} проверок пройдены`);
process.exit(failed.length ? 1 : 0);
