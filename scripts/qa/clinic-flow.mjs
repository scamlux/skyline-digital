// Сквозной сценарий шаблона «Клиника» (редизайн): плитка → запись, карта зубов → план → запись,
// слайдер отбеливания, три шага записи, кабинет (запись с планом, выходной врача, цена) → сайт.
// Chrome — локальный (puppeteer-core), Playwright/Chromium не ставим.
// Запуск: node scripts/qa/clinic-flow.mjs [a|b|all=all] ; BASE=http://localhost:3100 ; OUT=<папка скриншотов>
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE || "http://localhost:3100";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.env.OUT || "/tmp/clinic-shots";
const arg = process.argv[2] || "all";
const STYLES = arg === "all" ? ["a", "b"] : [arg];
const VIEWPORTS = [
  { name: "360", width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "390", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "430", width: 430, height: 932, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "1440", width: 1440, height: 900 },
];
// Фото, которые генерируются отдельно: их 404 в QA допускается (но отмечается).
const LATE_PHOTOS = /\/templates\/clinic\/img\/(consult|kids|scanner|whiten-before|whiten-after)-/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok: !!ok, extra });
  if (!ok) console.log("FAIL", name, extra);
};

for (const style of STYLES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport(vp);
    const errors = [];
    const lateMissing = new Set();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && !/_vercel|status of 404|MIME type/.test(m.text()) && errors.push(m.text()));
    page.on("response", (r) => {
      if (r.status() < 400) return;
      if (LATE_PHOTOS.test(r.url())) lateMissing.add(r.url().split("/").pop());
      else if (!/_vercel/.test(r.url())) errors.push(`${r.status()} ${r.url()}`);
    });
    const tag = `${vp.name}/${style}`;
    const mobile = vp.width < 700;
    const text = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim());
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const scrollTo = async (sel) => {
      await page.waitForSelector(sel, { visible: true });
      await page.$eval(sel, (el) => el.scrollIntoView({ block: "center" }));
      await sleep(180);
    };
    const click = async (sel) => {
      await scrollTo(sel);
      await page.click(sel);
    };
    const clickText = async (selector, label) => {
      const h = await page.evaluateHandle((selector, label) => [...document.querySelectorAll(selector)].find((e) => e.textContent.includes(label)), selector, label);
      const el = h.asElement();
      if (!el) throw new Error(`нет ${selector} «${label}»`);
      await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
      await sleep(150);
      await el.click();
    };
    const shot = (name, opts = {}) => page.screenshot({ path: `${OUT}/clinic2-${style}-${name}-${vp.name}.png`, ...opts });
    const fresh = async (path = `/sites/clinic/${style}`) => {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
      await sleep(1000);
    };

    try {
      await fresh();
      check(`${tag} старт: нет горизонтального скролла`, (await overflow()) <= 0, String(await overflow()));
      // Первый экран: плитки и картинка в 100svh (на телефоне).
      if (mobile) {
        const fold = await page.evaluate(() => {
          const t = document.querySelector(".cl-tiles")?.getBoundingClientRect();
          const v = document.querySelector(".cl-vis")?.getBoundingClientRect();
          return { tilesBottom: Math.round(t?.bottom ?? 0), visTop: Math.round(v?.top ?? 0), vh: innerHeight };
        });
        check(`${tag} плитки целиком на первом экране`, fold.tilesBottom <= fold.vh, JSON.stringify(fold));
      }
      if (["390", "1440"].includes(vp.name)) {
        await shot("hero");
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 500) {
            scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 70));
          }
          scrollTo(0, 0);
        });
        await sleep(700);
        await shot("full", { fullPage: true });
      }

      // 1. Плитка «Болит зуб» → панель → «Записаться» → окно записи открыто.
      await page.evaluate(() => scrollTo(0, 0));
      await sleep(200);
      await click(".cl-tile");
      await page.waitForSelector(".cl-panel[data-open]");
      const panel = await text(".cl-panel");
      check(`${tag} плитка: цена, визиты и врач`, /Болит зуб/.test(panel) && /250/.test(panel) && /визит/.test(panel) && /Рахимова/.test(panel), panel.slice(0, 140));
      if (vp.name === "390" || vp.name === "1440") {
        await sleep(700);
        await shot("tile");
      }
      await click(".cl-panel .cl-btn");
      await page.waitForSelector("dialog.cl-sheet[open]");
      check(`${tag} плитка: окно записи открылось`, true);
      await page.keyboard.press("Escape");
      await sleep(250);
      check(`${tag} Esc закрывает окно`, await page.evaluate(() => !document.querySelector("dialog.cl-sheet[open]")));

      // 2. Карта зубов: три зуба с проблемами → живая вилка → «Записаться с планом».
      const pickTooth = async (n, problem) => {
        // На телефоне видна одна челюсть: как настоящий пользователь, сначала переключаем вкладку «Верх / Низ».
        if (vp.width < 981) {
          await clickText(".cl-arches button", n >= 30 ? "Низ" : "Верх");
          await sleep(450);
        }
        await scrollTo(`[data-tooth="${n}"]`);
        await page.click(`[data-tooth="${n}"]`);
        await sleep(120);
        await clickText(".cl-pick .cl-chips button", problem);
        await sleep(120);
      };
      await scrollTo("#jaw-title");
      const box = await page.$eval(".cl-jaw-box", (el) => el.getBoundingClientRect().width);
      const hit = await page.evaluate(() => {
        const g = document.querySelector('[data-tooth="16"] .cl-hit').getBoundingClientRect();
        return Math.min(g.width, g.height);
      });
      check(`${tag} зона касания зуба ≥ 36px`, hit >= (mobile ? 33 : 36), `${hit.toFixed(1)} при ширине карты ${Math.round(box)}`);
      await pickTooth(16, "Кариес");
      await pickTooth(24, "Удалить");
      await pickTooth(36, "Имплант");
      const sum = await text(".cl-total");
      check(`${tag} карта: вилка 4,9–10,3 млн и 5 визитов`, /4,9–10,3/.test(sum) && /≈ 5 визит/.test(sum), sum);
      check(`${tag} карта: три зуба в плане`, (await page.$$(".cl-planlist li:not(.cl-empty)")).length === 3);
      if (vp.name === "390") {
        await scrollTo(".cl-jaw-box");
        await sleep(600);
        await shot("jaw");
      }
      await click(".cl-total .cl-btn");
      await page.waitForSelector("dialog.cl-sheet[open]");
      await sleep(400);
      const step1 = await text(".cl-plan");
      check(`${tag} запись: план с зубами подставлен`, /Лечение кариеса/.test(step1) && /16 · Кариес/.test(step1) && /36 · Имплант/.test(step1), step1);
      // 3. Три шага с индикатором.
      const stepNow = () => page.$eval('.cl-steps li[aria-current="step"]', (el) => el.textContent.trim());
      check(`${tag} индикатор: шаг 1`, /^1/.test(await stepNow()), await stepNow());
      await click(".cl-sheet-act .cl-btn:not(.ghost)");
      await sleep(250);
      check(`${tag} индикатор: шаг 2`, /^2/.test(await stepNow()), await stepNow());
      // Фильтр времени суток: «Вечер» оставляет только слоты с 16:00.
      await clickText(".cl-sheet .cl-chips button", "Вечер");
      await sleep(150);
      const evening = await page.$$eval(".cl-slots button", (els) => els.map((e) => e.textContent.trim()));
      check(`${tag} фильтр «Вечер»: только 16:00+`, evening.length > 0 && evening.every((t) => t >= "16:00"), evening.join(","));
      await clickText(".cl-sheet .cl-chips button", "Весь день");
      await page.waitForSelector(".cl-slots button:not([disabled])");
      const dayBtn = (await page.$$(".cl-dates button:not([disabled])"))[1];
      await dayBtn.click();
      await sleep(150);
      await page.click(".cl-slots button:not([disabled])");
      await sleep(150);
      const foot = await text(".cl-sheet-foot");
      check(`${tag} сводка: план, цена и время`, /4 900 000/.test(foot) && /\d\d:\d\d/.test(foot), foot.slice(0, 160));
      if (style === "a" && vp.name === "390") await shot("booking");
      await click(".cl-sheet-act .cl-btn:not(.ghost)");
      await sleep(250);
      check(`${tag} индикатор: шаг 3`, /^3/.test(await stepNow()), await stepNow());
      await page.type("#bk-name", `QA ${vp.name}${style}`);
      await page.type("#bk-phone", "+998 90 123 45 67");
      await click(".cl-sheet-act .cl-btn:not(.ghost)");
      await page.waitForSelector(".cl-success");
      const ok = await text(".cl-success");
      check(`${tag} запись выполнена`, /Рахимова|Каримов|Юсупова/.test(ok), ok.slice(0, 100));
      const tg = await page.$eval(".cl-success a.cl-btn", (a) => a.href);
      check(`${tag} успех: ссылка на Telegram с текстом`, /^https:\/\/t\.me\/.+\?text=/.test(tg) && /16/.test(decodeURIComponent(tg)), tg.slice(0, 80));
      await page.keyboard.press("Escape");
      await sleep(300);

      // 4. Слайдер отбеливания: клавиатура и перетаскивание.
      await scrollTo(".cl-ba");
      const p0 = await page.$eval(".cl-ba", (el) => el.style.getPropertyValue("--p"));
      await page.focus(".cl-ba input");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await sleep(80);
      const p1 = await page.$eval(".cl-ba", (el) => el.style.getPropertyValue("--p"));
      check(`${tag} слайдер: клавиатура сдвигает границу`, p1 !== p0, `${p0} → ${p1}`);
      const r = await page.$eval(".cl-ba", (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
      if (mobile) {
        await page.touchscreen.touchStart(r.x + r.w * 0.5, r.y + r.h * 0.5);
        await page.touchscreen.touchMove(r.x + r.w * 0.2, r.y + r.h * 0.5);
        await page.touchscreen.touchEnd();
      } else {
        await page.mouse.move(r.x + r.w * 0.5, r.y + r.h * 0.5);
        await page.mouse.down();
        await page.mouse.move(r.x + r.w * 0.2, r.y + r.h * 0.5, { steps: 6 });
        await page.mouse.up();
      }
      await sleep(120);
      const p2 = Number((await page.$eval(".cl-ba", (el) => el.style.getPropertyValue("--p"))).replace("%", ""));
      check(`${tag} слайдер: перетаскивание влево`, p2 < 45, `p=${p2}`);
      check(`${tag} слайдер: подписан «Иллюстрация»`, /Иллюстрация/.test(await text(".cl-ba")));

      // Карусели на телефоне: врачи листаются свайпом (scroll-snap).
      if (mobile) {
        const snap = await page.$eval(".cl-docs", (el) => ({ over: el.scrollWidth > el.clientWidth + 4, snap: getComputedStyle(el).scrollSnapType }));
        check(`${tag} врачи: snap-карусель на телефоне`, snap.over && /mandatory/.test(snap.snap), JSON.stringify(snap));
      }
      // Фильтр врачей.
      await clickText(".cl-filter button", "Хирург");
      await sleep(120);
      check(`${tag} фильтр врачей: Хирург → один врач`, (await page.$$(".cl-doc")).length === 1);
      await clickText(".cl-filter button", "Все");

      check(`${tag} конец: нет горизонтального скролла`, (await overflow()) <= 0, String(await overflow()));

      // 5–7. Кабинет: запись с планом, выходной врача, цена → сайт.
      await fresh("/sites/clinic/admin");
      await page.waitForSelector(".adm-tabs");
      await clickText(".adm-tabs button", "Записи");
      await page.waitForSelector(".adm-lead");
      const mine = await page.evaluateHandle((n) => [...document.querySelectorAll(".adm-lead")].find((e) => e.textContent.includes(n)), `QA ${vp.name}${style}`);
      const mineText = mine.asElement() ? await mine.asElement().evaluate((e) => e.textContent.replace(/\s+/g, " ")) : "";
      check(`${tag} кабинет: запись с планом и зубами`, /16 Кариес/.test(mineText) && /24 Удалить/.test(mineText) && /36 Имплант/.test(mineText), mineText.slice(0, 160));
      if (vp.name === "390" || vp.name === "1440") await shot("admin");
      check(`${tag} кабинет: нет горизонтального скролла`, (await overflow()) <= 0, String(await overflow()));
      // Выходной: Каримов (единственный хирург-имплантолог) — снимаем все дни.
      await clickText(".adm-tabs button", "Врачи");
      await page.waitForSelector(".adm-doc");
      const docs = await page.$$(".adm-doc");
      for (const d of docs) {
        const name = await d.$eval(".adm-doc-main b", (e) => e.textContent);
        if (!/Каримов/.test(name)) continue;
        for (const b of await d.$$('.adm-days button[aria-pressed="true"]')) await b.click();
      }
      await sleep(150);
      // Цена: «Лечение кариеса», нижняя граница → 300 000.
      await clickText(".adm-tabs button", "Услуги");
      await page.waitForSelector(".adm-item");
      const item = await page.evaluateHandle(() => [...document.querySelectorAll(".adm-item")].find((e) => e.textContent.includes("Лечение кариеса")));
      await (await item.asElement().$(".adm-range .adm-price")).click();
      await page.waitForSelector(".adm-price-input");
      await page.keyboard.down("Meta");
      await page.keyboard.press("a");
      await page.keyboard.up("Meta");
      await page.$eval(".adm-price-input", (i) => { i.value = ""; });
      await page.type(".adm-price-input", "300000");
      await page.keyboard.press("Enter");
      await sleep(250);
      // Сайт: обе правки видны.
      await fresh();
      await page.evaluate(() => scrollTo(0, 0));
      await clickText(".cl-tile", "Нет зуба");
      await page.waitForSelector(".cl-panel[data-open]");
      await sleep(250);
      const implant = await text(".cl-panel-next");
      check(`${tag} сайт: у врача выходной — окна нет («по телефону»)`, /по телефону/.test(implant), implant);
      await clickText(".cl-tile", "Болит зуб");
      await sleep(250);
      const pain = await text(".cl-panel-facts");
      check(`${tag} сайт: новая цена 300–1 200 тыс`, /300–1 200/.test(pain), pain);

      check(`${tag} итог: нет горизонтального скролла`, (await overflow()) <= 0, String(await overflow()));
    } catch (e) {
      check(`${tag} сценарий дошёл до конца`, false, e.message.slice(0, 200));
      try { await page.screenshot({ path: `${OUT}/fail-${style}-${vp.name}.png` }); } catch {}
    }
    check(`${tag} консоль: 0 ошибок`, errors.length === 0, errors.slice(0, 3).join(" | "));
    if (lateMissing.size) console.log(`  (${tag}) допущенные 404 фото: ${[...lateMissing].join(", ")}`);
    await ctx.close();
  }
}
await browser.close();
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}${r.extra && !r.ok ? ` — ${r.extra}` : ""}`);
console.log(`\n${results.length - failed.length}/${results.length} проверок пройдено`);
process.exit(failed.length ? 1 : 0);
