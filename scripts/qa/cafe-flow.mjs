// Сквозной сценарий шаблона «Кафе»: заказ с опциями и выпечкой → время → отправка → печать лояльности →
// кабинет видит заказ → «нет сегодня», витрина 0, правка цены → сайт всё это показывает.
// Chrome — локальный (puppeteer-core), Playwright/Chromium не ставим.
// Запуск: node scripts/qa/cafe-flow.mjs [style=a|b|both] ; BASE=http://localhost:3106 ; SHOTS=<папка скриншотов>
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3106";
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
const norm = (s) => String(s).replace(/[\s\u00a0\u202f]+/g, " ").trim();
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok: !!ok, extra });
  if (!ok) console.log(`  ✗ ${name} ${extra}`);
};

/** Клик по первому элементу селектора с нужным текстом (через DOM — не мешает липкая панель). */
const clickText = (page, selector, text) =>
  page.evaluate(
    (sel, txt) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.replace(/\s+/g, " ").includes(txt));
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    text,
  );
const text = (page, selector) => page.evaluate((s) => document.querySelector(s)?.textContent ?? "", selector);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function revealAll(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 450) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(110);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(350);
}

for (const style of STYLES) {
  for (const vp of VIEWPORTS) {
    const tag = `[${style} ${vp.name}]`;
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport(vp);
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      // 404 картинок-стока допустимы, пока файлы не легли (позиции рисуют плитку-фолбэк).
      if (/Failed to load resource.*404/.test(t)) return;
      errors.push(t);
    });
    const shot = (name) => page.screenshot({ path: path.join(SHOTS, name) });
    const big = vp.name === "390" || vp.name === "1440";

    // 1. Сайт: первый экран и весь путь.
    await page.goto(`${BASE}/sites/cafe/${style}`, { waitUntil: "networkidle0" });
    await sleep(900);
    if (big) await shot(`cafe-${style}-hero-${vp.name}.png`);
    const ctaBox = await page.evaluate(() => {
      const r = document.querySelector(".cf-hero .cf-cta")?.getBoundingClientRect();
      return r ? { bottom: r.bottom, h: r.height } : null;
    });
    check(`${tag} «Заказать навынос» в первом экране`, ctaBox && ctaBox.bottom <= vp.height, JSON.stringify(ctaBox));
    check(`${tag} hero: h1 один и заполнен`, (await page.$$eval("h1", (n) => n.length)) === 1);

    if (big) {
      await revealAll(page);
      await shot(`cafe-${style}-full-${vp.name}.png`);
    }
    check(`${tag} нет горизонтального переполнения (сайт)`, (await overflow(page)) <= 0, String(await overflow(page)));

    // Цели касания ≥ 44px у основных элементов.
    const small = await page.evaluate(() => {
      const sel = [".cf-cats button", ".cf-add", ".cf-cta", ".cf-lang a", ".cf-cartbtn"]; // .cf-card-open растянут на всю карточку через ::after
      const bad = [];
      for (const s of sel)
        for (const el of document.querySelectorAll(s)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.height < 44 || r.width < 44) bad.push(`${s} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      return bad.slice(0, 5);
    });
    check(`${tag} цели касания ≥ 44px`, small.length === 0, small.join("; "));

    // 2. Напиток с опциями: L + кокосовое = 32 000 + 5 000 + 5 000 = 42 000.
    await page.evaluate(() => document.getElementById("menu")?.scrollIntoView());
    await sleep(300);
    await page.evaluate(() => document.querySelector('.cf-add[aria-label*="Флэт"]')?.click());
    await page.waitForSelector(".cf-opt[open] .cf-chip", { timeout: 4000 }).catch(() => {});
    check(`${tag} шторка опций открылась`, await page.evaluate(() => !!document.querySelector(".cf-opt[open]")));
    const base = norm(await text(page, ".cf-opt-price"));
    await clickText(page, '.cf-opt[open] [role="radio"]', "L");
    await clickText(page, '.cf-opt[open] [role="radio"]', "Кокос");
    await sleep(150);
    const live = norm(await text(page, ".cf-opt-price"));
    check(`${tag} цена с опциями обновляется (${base} → ${live})`, base === "32 000 сум" && live === "42 000 сум");
    await clickText(page, ".cf-opt[open] .cf-cta", "Добавить");
    await sleep(250);
    check(`${tag} шторка опций закрылась`, await page.evaluate(() => !document.querySelector(".cf-opt[open]")));

    // Выпечка без опций добавляется сразу: 24 000.
    await clickText(page, ".cf-cats button", "Выпечка");
    await sleep(200);
    await page.evaluate(() => document.querySelector('.cf-add[aria-label*="круассан"]')?.click());
    await sleep(250);
    const pill = norm(await text(page, ".cf-sticky:not([data-hidden]) .cf-pill"));
    check(`${tag} липкая «пилюля»: 2 позиции, 66 000 сум`, /2/.test(pill) && pill.includes("66 000"), pill);
    check(`${tag} пилюля видна в зоне пальца (внизу экрана)`, await page.evaluate(() => {
      const r = document.querySelector(".cf-sticky .cf-pill")?.getBoundingClientRect();
      return !!r && r.bottom <= window.innerHeight + 1 && r.top > window.innerHeight * 0.6;
    }));

    // 3. Корзина: шаг «Заказ».
    await page.evaluate(() => document.querySelector(".cf-sticky .cf-pill")?.click());
    await page.waitForSelector(".cf-cart[open] .cf-total", { timeout: 4000 }).catch(() => {});
    await sleep(450);
    check(`${tag} итог в корзине 66 000 сум`, norm(await text(page, ".cf-cart .cf-total b")) === "66 000 сум", norm(await text(page, ".cf-cart .cf-total b")));
    check(`${tag} три шага с индикатором`, (await page.$$eval(".cf-cart .cf-steps li", (n) => n.length)) === 3);
    if (vp.name === "390") await shot(`cafe-${style}-cart-390.png`);
    check(`${tag} нет переполнения в шторке`, (await overflow(page)) <= 0);

    // 4. Время и контакты.
    await clickText(page, ".cf-cart .cf-cta", "Дальше");
    await sleep(200);
    const picked = await page.evaluate(() => {
      const quick = document.querySelector('.cf-cart .cf-chips.big [role="radio"][aria-checked="true"]');
      const slot = document.querySelector(".cf-cart .cf-slots [role=radio]");
      return { quick: !!quick, slots: document.querySelectorAll(".cf-cart .cf-slots [role=radio]").length, first: slot?.textContent ?? "" };
    });
    check(`${tag} время получения: есть выбор`, picked.slots > 0, JSON.stringify(picked));
    // Выберем «через 20 мин», если открыто, иначе первое время сетки.
    const chose20 = await clickText(page, '.cf-cart .cf-chips.big [role="radio"]', "20");
    if (!chose20) await page.evaluate(() => document.querySelector(".cf-cart .cf-slots [role=radio]")?.click());
    await sleep(150);
    await clickText(page, ".cf-cart .cf-cta", "Дальше");
    await sleep(200);
    await clickText(page, ".cf-cart .cf-cta", "Отправить");
    await sleep(200);
    check(`${tag} пустая форма не отправляется (ошибка на экране)`, await page.evaluate(() => !!document.querySelector(".cf-cart .cf-error")));
    await page.type('.cf-cart input[name="name"]', "Алина Тест");
    await page.type('.cf-cart input[name="phone"]', "+998901234567");
    await clickText(page, ".cf-cart .cf-cta", "Отправить");
    await page.waitForSelector(".cf-done", { timeout: 4000 }).catch(() => {});
    await sleep(300);
    check(`${tag} заказ принят`, /Заказ принят/.test(await text(page, ".cf-done")));
    const tg = await page.evaluate(() => document.querySelector(".cf-done a.cf-cta")?.getAttribute("href") ?? "");
    check(`${tag} ссылка Telegram с текстом заказа`, tg.startsWith("https://t.me/bodom_demo?text=") && norm(decodeURIComponent(tg)).includes("Флэт уайт") && norm(decodeURIComponent(tg)).includes("66 000"), tg.slice(0, 80));
    await clickText(page, ".cf-done .cf-ghost", "Готово");
    await sleep(300);

    // 5. Печать лояльности.
    await page.evaluate(() => document.getElementById("card")?.scrollIntoView());
    await sleep(500);
    check(`${tag} печать лояльности появилась`, (await page.$$eval(".cf-stamp[data-filled]", (n) => n.length)) === 1);
    check(`${tag} корзина пуста после заказа`, await page.evaluate(() => !document.querySelector(".cf-sticky:not([data-hidden]) .cf-pill-n b")));

    // 6. Кабинет видит заказ.
    await page.goto(`${BASE}/sites/cafe/admin`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".adm-tabs", { timeout: 6000 });
    await sleep(900);
    if (vp.name === "390" || vp.name === "1440") await shot(`cafe-admin-overview-${vp.name}.png`);
    check(`${tag} кабинет: обзор показывает цифры`, (await page.$$eval(".adm-stat", (n) => n.length)) >= 4);
    await clickText(page, ".adm-tabs button", "Заказы");
    await sleep(400);
    if (vp.name === "390" || vp.name === "1440") await shot(`cafe-admin-orders-${vp.name}.png`);
    const ordersText = norm(await text(page, ".adm-main"));
    check(`${tag} кабинет: заказ с сайта виден (имя, позиции, сумма)`, ordersText.includes("Алина Тест") && ordersText.includes("Флэт уайт") && ordersText.includes("66 000"), ordersText.slice(0, 120));
    check(`${tag} кабинет: у заказа есть время получения`, await page.evaluate(() => !!document.querySelector(".adm-lead time b")?.textContent.match(/\d\d:\d\d/)));
    await clickText(page, ".adm-lead .adm-btn", "Готовить");
    await sleep(200);
    check(`${tag} кабинет: статус меняется на «Готовится»`, /Готовится/.test(await text(page, ".adm-main")));

    // 7. Правки владельца: цена, «нет сегодня», витрина 0.
    await clickText(page, ".adm-tabs button", "Меню");
    await sleep(300);
    const priceSet = await page.evaluate(() => {
      const row = [...document.querySelectorAll(".adm-item")].find((r) => r.textContent.includes("Флэт уайт"));
      row?.querySelector(".adm-price")?.click();
      return !!row;
    });
    check(`${tag} кабинет: строка «Флэт уайт» найдена`, priceSet);
    await sleep(150);
    await page.evaluate(() => document.querySelector(".adm-price-input")?.select());
    await page.keyboard.type("35000");
    await page.keyboard.press("Enter");
    await sleep(250);
    await page.evaluate(() => {
      const row = [...document.querySelectorAll(".adm-item")].find((r) => r.textContent.includes("Капучино"));
      [...row.querySelectorAll("button")].find((b) => b.textContent.includes("Нет сегодня"))?.click();
    });
    await sleep(250);
    check(`${tag} кабинет: цена 35 000 сохранена`, norm(await text(page, ".adm-main")).includes("35 000"));
    await clickText(page, ".adm-tabs button", "Витрина");
    await sleep(300);
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => {
        const row = [...document.querySelectorAll(".adm-item")].find((r) => r.textContent.includes("Чизкейк"));
        row?.querySelector('.adm-round[aria-label*="Меньше"]:not(:disabled)')?.click();
      });
      await sleep(80);
    }
    check(`${tag} кабинет: витрина «Чизкейк» = 0`, await page.evaluate(() => {
      const row = [...document.querySelectorAll(".adm-item")].find((r) => r.textContent.includes("Чизкейк"));
      return /0\s/.test(row?.querySelector(".adm-count b")?.textContent ?? "") && /закончилось/.test(row?.textContent ?? "");
    }));
    check(`${tag} нет переполнения в кабинете`, (await overflow(page)) <= 0, String(await overflow(page)));

    // 8. Сайт отражает три правки.
    await page.goto(`${BASE}/sites/cafe/${style}`, { waitUntil: "networkidle0" });
    await sleep(700);
    const siteState = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".cf-menu .cf-card")];
      const byName = (n) => cards.find((c) => c.textContent.includes(n));
      const fw = byName("Флэт");
      return { price: fw?.querySelector(".cf-card-price")?.textContent ?? "" };
    });
    check(`${tag} сайт: цена флэт уайт 35 000`, norm(siteState.price) === "35 000 сум", siteState.price);
    await page.evaluate(() => document.getElementById("menu")?.scrollIntoView());
    await sleep(300);
    const cap = await page.evaluate(() => {
      const c = [...document.querySelectorAll(".cf-menu .cf-card")].find((x) => x.textContent.includes("Капучино"));
      return { off: c?.hasAttribute("data-off"), badge: c?.querySelector(".cf-badge")?.textContent ?? "", addDisabled: c?.querySelector(".cf-add")?.disabled };
    });
    check(`${tag} сайт: «Капучино» — нет сегодня, добавить нельзя`, cap.off && /нет сегодня/.test(cap.badge) && cap.addDisabled, JSON.stringify(cap));
    const cake = await page.evaluate(() => {
      const c = [...document.querySelectorAll(".cf-case .cf-card")].find((x) => x.textContent.includes("Чизкейк"));
      return { text: c?.querySelector(".cf-meter-t")?.textContent ?? "", addDisabled: c?.querySelector(".cf-add")?.disabled };
    });
    check(`${tag} сайт: витрина «Чизкейк» — закончилось`, /закончилось/.test(cake.text) && cake.addDisabled, JSON.stringify(cake));
    check(`${tag} сайт: печать лояльности сохранилась после перезагрузки`, (await page.$$eval(".cf-stamp[data-filled]", (n) => n.length)) === 1);
    check(`${tag} нет переполнения после правок`, (await overflow(page)) <= 0);
    check(`${tag} 0 ошибок в консоли`, errors.length === 0, errors.slice(0, 3).join(" | "));
    await ctx.close();
    console.log(`${tag} готово: ${results.filter((r) => r.ok).length}/${results.length}`);
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\nИтого: ${results.length - failed.length}/${results.length} проверок пройдено`);
if (failed.length) {
  for (const f of failed) console.log(`  ✗ ${f.name} ${f.extra}`);
  process.exit(1);
}
