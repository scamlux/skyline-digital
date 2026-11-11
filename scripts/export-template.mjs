#!/usr/bin/env node
// Экспорт шаблона сайта для бизнеса в самостоятельный статический проект Next.js (ADR 0009):
// клиент выкладывает его на своём бесплатном хостинге (Vercel / Netlify / Cloudflare Pages).
//
//   node scripts/export-template.mjs <restaurant|clinic|salon|cafe> --style a|b --out <dir>
//        [--locales ru,en,uz] [--with-admin] [--force]
//
// Что делает: проверяет, что шаблон самодостаточен (импорты только внутри src/site-templates),
// копирует его код, стили, шрифты и фото, генерирует каркас Next.js, site.config.ts и README.md.
// Зависимостей у скрипта нет: Node ESM, fs и компилятор TypeScript из devDependencies репозитория.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkImportGraph, describeViolation } from "./lib/import-graph.mjs";
import { readDemoFields, stripDemoParens } from "./lib/demo-fields.mjs";
import * as gen from "./lib/export-files.mjs";
import { listPhotos, readmeMd } from "./lib/export-readme.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_TEMPLATES = path.join(REPO, "src/site-templates");
const PUBLIC_TEMPLATES = path.join(REPO, "public/templates");
const ALL_LOCALES = ["ru", "en", "uz"];
/** Пакеты, которые будут в package.json проекта клиента. */
const ALLOWED_PACKAGES = ["react", "react-dom", "next"];
/** Файлы слоя витрины студии внутри src/site-templates: в проект клиента не попадают. */
const STUDIO_FILES = ["registry.tsx", "demo.ts"].map((f) => path.join(SITE_TEMPLATES, f));

const USAGE = `Использование:
  node scripts/export-template.mjs <${Object.keys(gen.TEMPLATE_META).join("|")}> --style a|b --out <папка> [--locales ru,en,uz] [--with-admin] [--force]

  --style a|b     стиль сайта (по умолчанию a)
  --out <папка>   куда выгрузить проект (должна быть пустой, если нет --force)
  --locales       языки через запятую; первый — основной (корень сайта). По умолчанию ru,en,uz
  --with-admin    добавить кабинет владельца (/admin, /en/admin, …): пустой, данные в браузере
  --force         выгружать в непустую папку (перезаписываются src/, public/ и файлы проекта)`;

class UserError extends Error {}

function parseArgs(argv) {
  const opts = { style: "a", locales: ALL_LOCALES, withAdmin: false, force: false, template: undefined, out: undefined };
  const rest = [...argv];
  const value = (flag) => {
    const v = rest.shift();
    if (v === undefined || v.startsWith("--")) throw new UserError(`${flag} требует значение`);
    return v;
  };
  while (rest.length > 0) {
    const arg = rest.shift();
    if (arg === "--help" || arg === "-h") throw new UserError("");
    else if (arg === "--style") opts.style = value(arg);
    else if (arg === "--out") opts.out = value(arg);
    else if (arg === "--locales") opts.locales = value(arg).split(",").map((s) => s.trim()).filter(Boolean);
    else if (arg === "--with-admin") opts.withAdmin = true;
    else if (arg === "--force") opts.force = true;
    else if (arg.startsWith("--")) throw new UserError(`Неизвестный флаг ${arg}`);
    else if (opts.template === undefined) opts.template = arg;
    else throw new UserError(`Лишний аргумент «${arg}»`);
  }
  if (!opts.template || !(opts.template in gen.TEMPLATE_META)) throw new UserError(`Укажите шаблон: ${Object.keys(gen.TEMPLATE_META).join(", ")}`);
  if (!["a", "b"].includes(opts.style)) throw new UserError("--style: a или b");
  if (!opts.out) throw new UserError("Укажите папку: --out <папка>");
  if (opts.locales.length === 0 || opts.locales.some((l) => !ALL_LOCALES.includes(l)) || new Set(opts.locales).size !== opts.locales.length) {
    throw new UserError(`--locales: непустой список без повторов из ${ALL_LOCALES.join(", ")}`);
  }
  return opts;
}

/** Не даём выгрузить проект поверх самого репозитория или его служебных папок. */
function assertSafeOut(out) {
  const rel = path.relative(REPO, out);
  const insideRepo = rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  const containsRepo = path.relative(out, REPO) === "" || !path.relative(out, REPO).startsWith("..");
  if (insideRepo || containsRepo || out === path.parse(out).root) {
    throw new UserError(`--out ${out}: папка совпадает с репозиторием студии, лежит в нём или содержит его`);
  }
}

const isTestFile = (name) => /\.test\.[cm]?[jt]sx?$/.test(name);
const isJunk = (name) => name === ".DS_Store" || / \d+(\.[^./]+)?$/.test(name); // «file 2.ts» — следы iCloud-дублей

/** Все не тестовые исходники папки (рекурсивно). */
function listSources(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (isJunk(entry.name)) continue;
    if (entry.isDirectory()) out.push(...listSources(p));
    else if (!isTestFile(entry.name)) out.push(p);
  }
  return out;
}

function write(out, rel, content) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** Версия установленного пакета из node_modules репозитория: точные версии, на которых шаблоны проверены. */
function installedVersion(pkg) {
  const file = path.join(REPO, "node_modules", pkg, "package.json");
  if (!fs.existsSync(file)) throw new UserError(`Не найден ${pkg} в node_modules репозитория: запустите \`npm install\`.`);
  return JSON.parse(fs.readFileSync(file, "utf8")).version;
}

/** Шаг 1: файлы, которые нужны шаблону, и проверка самодостаточности. */
function planSources(templateId) {
  const tplDir = path.join(SITE_TEMPLATES, templateId);
  const entries = [...listSources(tplDir), ...listSources(path.join(SITE_TEMPLATES, "kit")), path.join(SITE_TEMPLATES, "types.ts")].filter((f) =>
    /\.(ts|tsx)$/.test(f),
  );
  const { files, violations } = checkImportGraph({ entries, root: SITE_TEMPLATES, allowedPackages: ALLOWED_PACKAGES, studioFiles: STUDIO_FILES });
  if (violations.length > 0) {
    const lines = violations.map((v) => "  - " + describeViolation(v, REPO));
    throw new UserError(`Шаблон «${templateId}» не самодостаточен: он импортирует то, чего нет в проекте клиента.\n${lines.join("\n")}\nУберите эти импорты внутри src/site-templates/ и запустите экспорт снова.`);
  }
  // Копируем всё из entries и всё, что они втянули за пределами своих папок (внутри src/site-templates).
  const copy = new Set([...entries, ...files.filter((f) => !isTestFile(path.basename(f)))]);
  for (const f of listSources(tplDir)) copy.add(f); // json и прочие не-ts файлы папки шаблона
  const extras = [...copy].filter((f) => ![tplDir, path.join(SITE_TEMPLATES, "kit")].some((d) => f.startsWith(d + path.sep)) && f !== path.join(SITE_TEMPLATES, "types.ts"));
  return { copy: [...copy].sort(), extras };
}

/** Шаг 2: шрифты, на которые ссылаются CSS шаблона и строки в его коде (прелоады). */
function planFonts(cssFiles, sourceFiles) {
  const used = new Set();
  const take = (text) => {
    for (const m of text.matchAll(/\/templates\/fonts\/([A-Za-z0-9._-]+\.woff2?)/g)) used.add(m[1]);
  };
  for (const f of cssFiles) take(fs.readFileSync(f, "utf8"));
  for (const f of sourceFiles) take(fs.readFileSync(f, "utf8"));
  return [...used].sort();
}

/** Подмена списка языков в скопированном types.ts, чтобы переключатель языка не вёл на несуществующие страницы. */
function patchLocales(typesTs, locales) {
  if (locales.length === ALL_LOCALES.length && locales.every((l, i) => l === ALL_LOCALES[i])) return typesTs;
  const re = /export const LOCALES: Locale\[\] = \[[^\]]*\];/;
  if (!re.test(typesTs)) throw new UserError("types.ts: не нашёл строку `export const LOCALES: Locale[] = [...]` для подмены языков. Правьте скрипт экспорта.");
  return typesTs.replace(re, `export const LOCALES: Locale[] = ${JSON.stringify(locales)};`);
}

/** Шаг 7: каждая статическая ссылка /templates/... в исходниках, CSS и README должна указывать на реальный файл. */
function verifyAssets(out, files) {
  const missing = new Set();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(/["'`(]\/templates\/([A-Za-z0-9._\-/]+\.[a-z0-9]+)/g)) {
      if (!fs.existsSync(path.join(out, "public/templates", m[1]))) missing.add(`${path.relative(out, file)} → /templates/${m[1]}`);
    }
  }
  if (missing.size > 0) throw new UserError(`В проекте не хватает файлов, на которые ссылается код или CSS:\n  - ${[...missing].join("\n  - ")}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { template: templateId, style, locales, withAdmin } = opts;
  const meta = gen.TEMPLATE_META[templateId];
  const out = path.resolve(opts.out);
  assertSafeOut(out);
  if (fs.existsSync(out) && fs.readdirSync(out).length > 0 && !opts.force) {
    throw new UserError(`Папка ${out} не пуста. Выберите другую или добавьте --force.`);
  }

  // 1. Самодостаточность и список файлов (до любой записи на диск).
  const plan = planSources(templateId);
  for (const extra of plan.extras) console.warn(`предупреждение: шаблон тянет модуль вне своей папки, kit/ и types.ts: ${path.relative(REPO, extra)}`);

  // 2. Данные для site.config.ts.
  const [dataFile, constName] = meta.data.fieldsFrom[style];
  const fields = await readDemoFields(path.join(SITE_TEMPLATES, templateId, dataFile), constName);

  // 3. Папки проекта. --force перезаписывает только то, чем управляет экспорт.
  fs.mkdirSync(out, { recursive: true });
  if (opts.force) for (const managed of ["src", "public"]) fs.rmSync(path.join(out, managed), { recursive: true, force: true });

  // 4. Код шаблона.
  for (const file of plan.copy) {
    const dest = path.join(out, "src/site-templates", path.relative(SITE_TEMPLATES, file));
    const rel = path.relative(SITE_TEMPLATES, file);
    if (rel === "types.ts") write(out, "src/site-templates/types.ts", patchLocales(fs.readFileSync(file, "utf8"), locales));
    // В данных шаблона остаются пометки «(демо)» у вымышленных позиций: в проект клиента они не едут.
    else if (/^[a-z]+[\\/]data(-\w+)?\.ts$/.test(rel)) write(out, path.join("src/site-templates", rel), stripDemoParens(fs.readFileSync(file, "utf8")));
    else copyFile(file, dest);
  }

  // 5. Публичные файлы: CSS шаблона, его папка с фото, нужные шрифты.
  const cssFiles = fs
    .readdirSync(PUBLIC_TEMPLATES)
    .filter((f) => f.startsWith(templateId) && f.endsWith(".css"))
    .sort();
  if (!cssFiles.includes(`${templateId}.css`)) throw new UserError(`Нет public/templates/${templateId}.css`);
  for (const css of cssFiles) copyFile(path.join(PUBLIC_TEMPLATES, css), path.join(out, "public/templates", css));
  const photoDir = path.join(PUBLIC_TEMPLATES, templateId);
  if (!fs.existsSync(photoDir)) throw new UserError(`Нет папки public/templates/${templateId}/`);
  fs.cpSync(photoDir, path.join(out, "public/templates", templateId), { recursive: true, filter: (src) => !isJunk(path.basename(src)) });
  const fonts = planFonts(cssFiles.map((f) => path.join(PUBLIC_TEMPLATES, f)), plan.copy);
  for (const font of fonts) {
    const src = path.join(PUBLIC_TEMPLATES, "fonts", font);
    if (!fs.existsSync(src)) throw new UserError(`CSS или код ссылаются на шрифт ${font}, а public/templates/fonts/${font} нет`);
    copyFile(src, path.join(out, "public/templates/fonts", font));
  }
  for (const lic of fs.readdirSync(path.join(PUBLIC_TEMPLATES, "fonts")).filter((f) => f.startsWith("OFL-"))) {
    const family = lic.slice(4, -4).toLowerCase();
    if (fonts.some((f) => f.startsWith(family))) copyFile(path.join(PUBLIC_TEMPLATES, "fonts", lic), path.join(out, "public/templates/fonts", lic));
  }
  write(out, "public/favicon.svg", gen.faviconSvg(fields.name));

  // Источники стоковых фото — только этого шаблона, в корне проекта (не в public).
  const credits = JSON.parse(fs.readFileSync(path.join(PUBLIC_TEMPLATES, "STOCK-CREDITS.json"), "utf8")).filter((c) => String(c.file).startsWith(`${templateId}/`));
  write(out, "CREDITS.json", JSON.stringify(credits, null, 2) + "\n");

  // 6. Каркас проекта.
  write(
    out,
    "package.json",
    JSON.stringify(
      {
        name: `${templateId}-site`,
        version: "1.0.0",
        private: true,
        scripts: { dev: "next dev", build: "next build" },
        engines: { node: ">=20.9.0" },
        dependencies: { next: installedVersion("next"), react: installedVersion("react"), "react-dom": installedVersion("react-dom") },
        devDependencies: {
          "@types/node": installedVersion("@types/node"),
          "@types/react": installedVersion("@types/react"),
          "@types/react-dom": installedVersion("@types/react-dom"),
          typescript: installedVersion("typescript"),
        },
      },
      null,
      2,
    ) + "\n",
  );
  write(out, "next.config.mjs", gen.nextConfigMjs());
  write(out, "tsconfig.json", gen.tsconfigJson());
  write(out, "netlify.toml", gen.netlifyToml());
  write(out, ".gitignore", gen.gitignore());
  write(out, "site.config.ts", gen.siteConfigTs({ templateId, style, withAdmin, fields }));
  write(out, "src/site/apply-config.ts", gen.applyConfigTs());
  write(out, "src/site/data.ts", gen.dataTs({ templateId, style }));
  write(out, "src/site/template.tsx", gen.templateTsx({ templateId, withAdmin }));
  write(out, "src/site/routes.ts", gen.routesTs({ locales, withAdmin }));
  write(out, "src/site/seo.ts", gen.seoTs());
  write(out, "src/app/base.css", gen.baseCss(REPO));
  write(out, "src/app/[[...lang]]/layout.tsx", gen.layoutTsx());
  write(out, "src/app/[[...lang]]/page.tsx", gen.pageTsx({ withAdmin }));
  write(out, "src/app/robots.ts", gen.robotsTs({ withAdmin }));
  write(out, "src/app/sitemap.ts", gen.sitemapTs());

  // 7. Проверка ссылок на ресурсы и README (фото считаем по готовой папке).
  const checked = [...listSources(path.join(out, "src")), ...cssFiles.map((f) => path.join(out, "public/templates", f)), path.join(out, "src/site/data.ts")];
  verifyAssets(out, checked);
  write(out, "README.md", readmeMd({ templateId, style, locales, withAdmin, photos: listPhotos(path.join(out, "public/templates", templateId, "img")), fields, dataFile }));

  console.log(`Готово: ${out}`);
  console.log(`  шаблон ${templateId}, стиль ${style}, языки ${locales.join(",")}${withAdmin ? ", с кабинетом владельца" : ""}, режим client (без демо-контента)`);
  console.log(`  файлов шаблона: ${plan.copy.length}, шрифтов: ${fonts.length}, фото-файлов: ${fs.readdirSync(path.join(out, "public/templates", templateId, "img")).length}`);
  console.log("Дальше:  cd " + out + " && npm install && npm run build   (результат в папке out/)");
}

main().catch((e) => {
  if (e instanceof UserError) {
    // Пустое сообщение — запрос справки (--help): это не ошибка.
    console.error(e.message ? `Ошибка: ${e.message}\n` : "");
    console.error(USAGE);
    process.exit(e.message ? 1 : 0);
  } else {
    console.error(e);
  }
  process.exit(1);
});
