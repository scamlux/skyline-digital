// README.md для проекта клиента (на русском). Часть таблиц считается из реальных файлов
// экспорта: список фото с размерами и пометки «демо», которые остались в текстах шаблона.
import fs from "node:fs";
import path from "node:path";
import { TEMPLATE_META } from "./export-files.mjs";

/** Ширина×высота WebP по заголовку файла; null, если формат не распознан. */
export function webpSize(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const kind = buf.toString("ascii", 12, 16);
  if (kind === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (kind === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === "VP8X") return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
  return null;
}

/**
 * Группирует `public/templates/<tpl>/img` по базовому имени: «kazan-480.webp» → kazan: [240, 480, 960].
 * @returns {{ base: string; widths: number[]; size: string | null }[]}
 */
export function listPhotos(imgDir) {
  if (!fs.existsSync(imgDir)) return [];
  const groups = new Map();
  for (const name of fs.readdirSync(imgDir).sort()) {
    const m = /^(.+)-(\d+)\.(webp|jpg|jpeg|png)$/.exec(name);
    if (!m) continue;
    const g = groups.get(m[1]) ?? { base: m[1], ext: m[3], widths: [], largest: { w: 0, name } };
    g.widths.push(Number(m[2]));
    if (Number(m[2]) >= g.largest.w) g.largest = { w: Number(m[2]), name };
    groups.set(m[1], g);
  }
  return [...groups.values()].map((g) => {
    const dim = g.ext === "webp" ? webpSize(fs.readFileSync(path.join(imgDir, g.largest.name))) : null;
    return { base: g.base, ext: g.ext, widths: g.widths.sort((a, b) => a - b), size: dim ? `${dim.w}×${dim.h}` : null };
  });
}

/** Строки ru-текстов с пометками «демо/вымышлено» в ui.ts и data.ts шаблона (их владелец уберёт сам). */
export function findDemoMarks(tplDir) {
  const marks = [];
  for (const file of fs.readdirSync(tplDir).filter((f) => /^(ui|data)(-\w+)?\.ts$/.test(f)).sort()) {
    fs.readFileSync(path.join(tplDir, file), "utf8")
      .split("\n")
      .forEach((line, idx) => {
        const m = /\bru:\s*"([^"]*(?:демо|Демо|вымышл)[^"]*)"/.exec(line);
        if (m) marks.push({ file, line: idx + 1, text: m[1] });
      });
  }
  return marks;
}

const cell = (s) => String(s).replace(/\|/g, "\\|");

/**
 * @param {object} p
 * @param {string} p.templateId
 * @param {string} p.style
 * @param {string[]} p.locales
 * @param {boolean} p.withAdmin
 * @param {{ base: string; ext: string; widths: number[]; size: string | null }[]} p.photos
 * @param {{ file: string; line: number; text: string }[]} p.marks
 * @param {Record<string, unknown>} p.fields
 */
export function readmeMd({ templateId, style, locales, withAdmin, photos, marks, fields }) {
  const meta = TEMPLATE_META[templateId];
  const routes = locales.map((l, i) => (i === 0 ? "`/`" : `\`/${l}/\``)).join(", ");
  const photoRows = photos.map((p) => `| \`${p.base}\` | ${p.widths.join(" / ")} | ${p.size ?? "—"} | \`${p.base}-<ширина>.${p.ext}\` |`).join("\n");
  const markRows = marks.map((m) => `| \`src/site-templates/${templateId}/${m.file}\`, строка ${m.line} | ${cell(m.text)} |`).join("\n");
  const adminSection = withAdmin
    ? `## Кабинет владельца (/admin): это демо, а не настоящая админка

**Что это.** Страница \`/admin/\` показывает, как мог бы выглядеть кабинет владельца: заявки, сводка, правка цен/меню/часов. Все данные кабинета хранятся **в \`localStorage\` браузера**, в котором его открыли, на сервер ничего не уходит (сервера нет).

**Что это значит на практике.**
- Заявки, которые оставляют посетители сайта, **не попадают** в кабинет владельца: они лежат в браузере самого посетителя. Настоящие заявки приходят только через Telegram (см. ниже).
- Правки цен и меню в кабинете меняют только тот браузер, где их сделали. Посетители их не увидят. Настоящие правки — в \`src/site-templates/${templateId}/data.ts\` и новый деплой.
- Страница \`/admin/\` ничем не защищена: любой, кто знает адрес, увидит демо-экран со **своими** (пустыми) данными. В поиск она не попадает (\`noindex\`, нет в sitemap, закрыта в robots.txt).
- Ключи в localStorage начинаются с \`skyline-demo-\` (их можно очистить кнопкой «Сбросить демо» в кабинете).

**Как выключить.** В \`site.config.ts\` поставьте \`admin: false\` и пересоберите сайт: страницы \`/admin/\` не будут созданы совсем. Для настоящего клиентского сайта это рекомендуемое состояние.

**Как включить.** Верните \`admin: true\` и пересоберите. Если проект был экспортирован без кабинета (без флага \`--with-admin\`), включить его в этой папке нельзя: перевыгрузите проект командой экспорта из репозитория студии с флагом \`--with-admin\`.
`
    : `## Кабинет владельца

В этот проект кабинет владельца **не включён** (экспорт без флага \`--with-admin\`). Кабинет шаблона — это демо на \`localStorage\` браузера, а не настоящая админка: заявки посетителей он не видит. Если он понадобится как наглядный пример, перевыгрузите проект командой экспорта из репозитория студии с флагом \`--with-admin\`.
`;

  return `# Сайт «${meta.title}»: статический проект для хостинга клиента

Это полностью **статический сайт** на Next.js (\`output: "export"\`): после сборки получается папка \`out/\` с обычными HTML/CSS/JS-файлами. Серверов, баз данных и платных сервисов нет, поэтому сайт спокойно живёт на бесплатных тарифах Vercel, Netlify и Cloudflare Pages.

- Шаблон: **${meta.title}**, стиль **${style}** — ${meta.styleNames[style]}.
- Языки: ${locales.map((l) => `\`${l}\``).join(", ")} (страницы: ${routes}).${withAdmin ? "\n- Демо-кабинет владельца: включён (`/admin/`), см. раздел «Кабинет владельца»." : ""}
- Стек: только \`next\`, \`react\`, \`react-dom\` (и TypeScript для сборки). Остальных зависимостей нет.

## Быстрый старт

Нужен Node.js 20.9 или новее.

\`\`\`bash
npm install
npm run dev      # сайт на http://localhost:3000
npm run build    # статическая сборка в папку out/
\`\`\`

Чтобы посмотреть готовую сборку локально: \`npx serve out\`.

## Что поменять под клиента

1. **\`site.config.ts\`** (корень проекта): название, телефон, Telegram, адрес, часы работы, ссылка на карту, адрес сайта (\`siteUrl\`) и режим заявок. Меняются только значения. Поля заполнены демо-данными шаблона: ${fields.name ? `сейчас это «${String(fields.name)}»` : "замените их"}.
2. **\`src/site-templates/${templateId}/data.ts\`**: меню/услуги/врачи/цены/отзывы и т.п. Это обычный TypeScript-объект на трёх языках (\`ru\`, \`en\`, \`uz\`); смотрите, как устроены существующие записи, и правьте по образцу. Узбекский — латиницей, апостроф «ʻ» (U+02BB).
3. **\`src/site-templates/${templateId}/ui.ts\`**: тексты интерфейса (кнопки, подписи, подсказки).
4. **Фото**: раздел «Как заменить фото» ниже.
5. Пересоберите сайт и выложите.

Подробности про \`site.config.ts\`:

| Поле | Что делает |
| --- | --- |
| \`siteUrl\` | Адрес сайта после публикации, без «/» на конце. Нужен для \`canonical\`, \`og:image\`, \`sitemap.xml\`. Можно задать переменной окружения \`SITE_URL\`; на Vercel и Netlify адрес подхватывается сам (но свой домен лучше вписать). Пока он не задан, сборка пишет предупреждение, а адреса указывают на \`example.com\`. |
| \`bookingMode\` | \`"telegram"\`: форма записи/заказа открывает чат владельца в Telegram с готовым текстом. \`"demo"\`: показывается только подтверждение, никуда ничего не уходит. Для настоящего сайта нужен \`"telegram"\`. |
| \`name\`, \`tagline\` | Название и подпись: заголовок страницы, описание для поиска, превью в мессенджерах. |
| \`phone\` | \`display\` — как показывать, \`e164\` — для ссылки «позвонить» (\`+998…\` без пробелов). |
| \`telegram\` | Имя в Telegram без «@»: на \`https://t.me/<имя>\` уходят заявки. |
| \`address\`, \`hours\`, \`mapUrl\` | Адрес на трёх языках, часы работы (время Ташкента, UTC+5), ссылка на карту. |
${withAdmin ? "| `admin` | `true` — собрать демо-кабинет `/admin/`, `false` — не собирать. |\n" : ""}
## Как работает запись или заказ

Сервера у сайта нет. В режиме \`"telegram"\` по кнопке «Записаться/Заказать» открывается чат владельца (\`t.me/<telegram>\`) с уже набранным текстом заявки, и **гость сам отправляет сообщение**. Если гость закрыл чат, не нажав «Отправить», владелец заявки не получит. Подтверждения «заявка принята» от сервера нет. Если нужны гарантированные заявки на почту/в CRM, понадобится отдельный сервис или бэкенд: в этот статический проект он не входит.

## Как выложить на бесплатный хостинг

Во всех вариантах: команда сборки \`npm run build\`, папка с результатом \`out\`. Загрузите проект в Git-репозиторий (GitHub/GitLab/Bitbucket) на **аккаунте клиента**: хостинг будет собирать сайт при каждом пуше. \`node_modules\`, \`.next\` и \`out\` в репозиторий не кладём (они в \`.gitignore\`).

### Vercel

1. vercel.com → Add New… → Project → импортируйте репозиторий.
2. Framework Preset определится сам (Next.js), настройки сборки менять не нужно.
3. (По желанию) Settings → Environment Variables: \`SITE_URL\` = адрес сайта. Без неё Vercel подставит адрес вида \`*.vercel.app\`.
4. Deploy. Свой домен: Settings → Domains.
5. Проверьте условия: по правилам Vercel бесплатный тариф Hobby предназначен для **некоммерческого** использования. Для коммерческого сайта клиента сверьтесь с актуальными условиями и при необходимости выберите Netlify или Cloudflare Pages.

### Netlify

1. app.netlify.com → Add new site → Import an existing project → выберите репозиторий.
2. Build command: \`npm run build\`, Publish directory: \`out\` (то же самое уже записано в \`netlify.toml\`, поля заполнятся сами).
3. Deploy. Адрес сайта Netlify передаёт сам (переменная \`URL\`), а для своего домена впишите \`siteUrl\` в \`site.config.ts\`.
4. Без Git: соберите локально \`npm run build\` и перетащите папку \`out\` на app.netlify.com/drop.

### Cloudflare Pages

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → репозиторий.
2. Framework preset: Next.js (Static HTML Export); Build command: \`npm run build\`; Build output directory: \`out\`.
3. Environment variables: \`NODE_VERSION\` = \`22\` (нужен Node 20.9+) и \`SITE_URL\` = адрес сайта (Cloudflare его сам не передаёт).
4. Save and Deploy. Свой домен: вкладка Custom domains.
5. Без Git: \`npm run build\`, затем \`npx wrangler pages deploy out\`.

После выкладки откройте \`/sitemap.xml\` и \`/robots.txt\`, добавьте сайт в Google Search Console и Яндекс Вебмастер.

## SEO

Страницы открыты для индексации. Заголовок, описание, \`og:image\`, \`hreflang\` и \`canonical\` строятся из данных сайта и \`siteUrl\`. Превью для соцсетей: \`public/templates/${templateId}/img/og-1200.jpg\`, 1200×630 пикселей, JPG (WebP мессенджеры показывают плохо). \`sitemap.xml\` и \`robots.txt\` создаются при сборке.

## Как заменить фото

**Все фото в шаблоне: демо-заглушки** (сгенерированы ИИ или бесплатные стоки Unsplash/Pexels), под клиента их нужно заменить его снимками. Автор и лицензия каждого стокового файла записаны в \`CREDITS.json\` (корень проекта; обе лицензии разрешают коммерческое использование без указания автора).

Фото лежат в \`public/templates/${templateId}/img/\`. Каждое фото — набор файлов одного кадра в нескольких ширинах: \`<имя>-<ширина>.webp\`; страница сама выбирает подходящую ширину (\`srcset\`). Чтобы заменить кадр:

1. Подготовьте новый снимок **с теми же пропорциями**, что у старого (иначе кадр обрежется или поплывёт вёрстка).
2. Сделайте из него WebP во всех ширинах из таблицы ниже (например, через squoosh.app или \`cwebp\`) и сохраните под **теми же именами**, перезаписав старые файлы.
3. Файл превью для соцсетей \`og-1200.jpg\` заменяется отдельно (1200×630, JPG).
4. Если нужны новые снимки, а не замена: положите их набором \`<новое-имя>-<ширина>.webp\` и укажите \`<новое-имя>\` в поле \`photo\` соответствующей записи в \`data.ts\`.

| Имя | Ширины, px | Размер самого большого, px | Формат файлов |
| --- | --- | --- | --- |
${photoRows}

${adminSection}
## Пометки «демо» в текстах

Шаблон — демо с вымышленным бизнесом, поэтому в текстах остались пометки о том, что данные демонстрационные. Перед сдачей клиенту замените демо-данные настоящими и **уберите или перепишите эти строки** (ищите по тексту):

${marks.length > 0 ? `| Где | Текст (ru) |\n| --- | --- |\n${markRows}` : "Пометок не найдено."}

То же касается блоков «отзывы», «цены», «врачи/мастера» и т.п.: в \`data.ts\` лежат вымышленные данные.

## Структура проекта

\`\`\`
site.config.ts                  # настройки клиента (имя, контакты, часы, режим заявок)
src/site-templates/${templateId}/      # шаблон: data.ts (контент), ui.ts (тексты интерфейса), компоненты
src/site-templates/kit/         # общие кирпичики шаблонов (карусель, часы, анимации)
src/site/                       # обвязка: конфиг → данные шаблона, маршруты, SEO
src/app/                        # страницы Next.js, robots.txt, sitemap.xml, базовые стили
public/templates/               # стили шаблона (*.css), шрифты и фото
CREDITS.json                    # источники и лицензии стоковых фото
\`\`\`

Стили шаблона лежат не в \`src\`, а в \`public/templates/${templateId}*.css\` и подключаются ссылкой \`<link>\`. Шрифты (Onest/Literata/Nunito и т.п.) отдаются с вашего же хостинга, внешних запросов нет.

## Ограничения

- Нет бэкенда: онлайн-оплаты, личных кабинетов, настоящих заявок в CRM/на почту нет.
- Адрес сайта в \`site.config.ts\` нужно вписать самому, иначе \`canonical\` и \`sitemap.xml\` будут вести на \`example.com\`.
- Сайт рассчитан на размещение в корне домена (\`https://домен/\`), а не в подпапке.
`;
}
