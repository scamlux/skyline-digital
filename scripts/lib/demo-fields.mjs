// Достаёт из data-файла шаблона «паспортные» поля бизнеса (имя, телефон, адрес, часы…),
// чтобы предзаполнить ими site.config.ts. Разбор — через компилятор TypeScript (он уже
// есть в devDependencies репозитория, новых зависимостей нет): читаем литералы из AST и
// ничего не исполняем. Если поле — не литерал, падаем громко, а не подставляем догадку.
import fs from "node:fs";

/** Поля, которые владелец правит в site.config.ts. */
export const CONFIG_FIELDS = ["name", "tagline", "phone", "telegram", "address", "hours", "mapUrl"];

/** Ключи, которые остаются в config у вложенных объектов (прочее, например closedDays, правится в data.ts). */
const NESTED_KEYS = { hours: ["open", "close"], phone: ["display", "e164"] };

/** Пометки «(демо-адрес)», «(demo manzil)» в скобках: в site.config.ts клиента им не место. */
const DEMO_PAREN = /\s*\((?:демо|demo)[^)]*\)/gi;

/** Убирает демо-пометки в скобках из текста (файла или строки). */
export const stripDemoParens = (text) => text.replace(DEMO_PAREN, "");

/** Убирает демо-пометки из строк (рекурсивно по объектам и массивам). */
export function stripDemoMarks(value) {
  if (typeof value === "string") return stripDemoParens(value).trim();
  if (Array.isArray(value)) return value.map(stripDemoMarks);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripDemoMarks(v)]));
  return value;
}

/**
 * @param {import("typescript")} ts
 * @param {import("typescript").Node} node
 */
function evalLiteral(ts, node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return evalLiteral(ts, node.expression);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((e) => evalLiteral(ts, e));
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) throw new Error("не литерал: " + prop.getText());
      out[propName(ts, prop.name)] = evalLiteral(ts, prop.initializer);
    }
    return out;
  }
  throw new Error("не литерал: " + node.getText());
}

function propName(ts, name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  throw new Error("вычисляемое имя свойства: " + name.getText());
}

/**
 * @param {string} file абсолютный путь к data-файлу
 * @param {string} constName имя экспортируемой константы с данными бизнеса
 * @returns {Promise<Record<string, unknown>>} значения полей из CONFIG_FIELDS (+ brand, если есть)
 */
export async function readDemoFields(file, constName) {
  let ts;
  try {
    ts = (await import("typescript")).default;
  } catch {
    throw new Error("Не найден пакет typescript (devDependency репозитория): запустите `npm install` в корне студии.");
  }
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let literal = null;
  source.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.name.text === constName && decl.initializer) {
        let init = decl.initializer;
        while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init) || ts.isSatisfiesExpression(init)) init = init.expression;
        if (ts.isObjectLiteralExpression(init)) literal = init;
      }
    }
  });
  if (!literal) throw new Error(`${file}: не найден объектный литерал «${constName}»`);

  const result = {};
  for (const prop of literal.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = propName(ts, prop.name);
    if (![...CONFIG_FIELDS, "brand"].includes(key)) continue;
    let value;
    try {
      value = evalLiteral(ts, prop.initializer);
    } catch (e) {
      throw new Error(`${file}: поле «${key}» — ${e.message}. Экспорт не может предзаполнить site.config.`);
    }
    const keep = NESTED_KEYS[key];
    result[key] = stripDemoMarks(keep ? Object.fromEntries(keep.filter((k) => k in value).map((k) => [k, value[k]])) : value);
  }
  const missing = CONFIG_FIELDS.filter((k) => !(k in result));
  if (missing.length > 0) throw new Error(`${file}: у «${constName}» нет полей ${missing.join(", ")}`);
  return result;
}
