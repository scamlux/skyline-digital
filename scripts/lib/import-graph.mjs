// Статический обходчик графа импортов для экспорта шаблона (scripts/export-template.mjs).
// Без зависимостей: маленький токенайзер (пропускает комментарии, строки, шаблонные строки
// и регулярные выражения) + поиск импортов по токенам, а не по сырому тексту. Поэтому
// «import x from 'y'» внутри комментария или строки не считается импортом.
import fs from "node:fs";
import path from "node:path";

const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".json"];

/** Слова, после которых `/` открывает регулярное выражение, а не деление. */
const REGEX_AFTER_WORDS = new Set(["return", "typeof", "case", "do", "else", "in", "of", "void", "delete", "throw", "new", "yield", "await"]);

/**
 * Разбивает исходник на токены: слова, строки и пунктуацию. Комментарии выбрасываются.
 * Для строк в токене лежит значение без кавычек; у шаблонных строк с подстановками `${}`
 * ставится флаг `dynamic`.
 * @param {string} src
 * @returns {{ t: "word" | "str" | "punct"; v: string; dynamic?: boolean }[]}
 */
export function tokenize(src) {
  const tokens = [];
  const n = src.length;
  let i = 0;

  const prev = () => tokens[tokens.length - 1];
  const regexAllowed = () => {
    const p = prev();
    if (!p) return true;
    if (p.t === "str") return false;
    if (p.t === "word") return REGEX_AFTER_WORDS.has(p.v);
    // `</div>`: слэш после `<` — закрывающий JSX-тег, а не регулярное выражение.
    return ![")", "]", "}", "<"].includes(p.v);
  };

  /** Читает строку в кавычках; возвращает индекс после закрывающей. */
  const readQuoted = (start, quote) => {
    let j = start + 1;
    let value = "";
    while (j < n && src[j] !== quote) {
      if (src[j] === "\\") {
        value += src[j + 1] ?? "";
        j += 2;
        continue;
      }
      value += src[j];
      j += 1;
    }
    tokens.push({ t: "str", v: value });
    return j + 1;
  };

  /** Читает шаблонную строку с учётом вложенных `${ ... }` (в том числе с обратными кавычками). */
  const readTemplate = (start) => {
    let j = start + 1;
    let value = "";
    let dynamic = false;
    while (j < n && src[j] !== "`") {
      if (src[j] === "\\") {
        value += src[j + 1] ?? "";
        j += 2;
        continue;
      }
      if (src[j] === "$" && src[j + 1] === "{") {
        dynamic = true;
        j = skipBraces(j + 2);
        continue;
      }
      value += src[j];
      j += 1;
    }
    tokens.push({ t: "str", v: value, dynamic });
    return j + 1;
  };

  /** Пропускает тело `${ ... }`; возвращает индекс после закрывающей `}`. */
  const skipBraces = (start) => {
    let depth = 1;
    let j = start;
    while (j < n && depth > 0) {
      const c = src[j];
      if (c === "`") {
        const saved = tokens.length;
        j = readTemplate(j);
        tokens.length = saved;
        continue;
      }
      if (c === '"' || c === "'") {
        const saved = tokens.length;
        j = readQuoted(j, c);
        tokens.length = saved;
        continue;
      }
      if (c === "{") depth += 1;
      if (c === "}") depth -= 1;
      j += 1;
    }
    return j;
  };

  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      i = readQuoted(i, c);
      continue;
    }
    if (c === "`") {
      i = readTemplate(i);
      continue;
    }
    if (c === "/" && regexAllowed()) {
      // Регулярное выражение: до незаэкранированной `/` вне класса [...].
      let j = i + 1;
      let inClass = false;
      while (j < n) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === "[") inClass = true;
        else if (src[j] === "]") inClass = false;
        else if (src[j] === "/" && !inClass) break;
        else if (src[j] === "\n") break;
        j += 1;
      }
      tokens.push({ t: "punct", v: "/regex/" });
      i = j + 1;
      while (i < n && /[a-z]/i.test(src[i])) i += 1; // флаги
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(src[j])) j += 1;
      tokens.push({ t: "word", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/\d/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w.]/.test(src[j])) j += 1;
      tokens.push({ t: "word", v: src.slice(i, j) });
      i = j;
      continue;
    }
    tokens.push({ t: "punct", v: c });
    i += 1;
  }
  return tokens;
}

/**
 * Находит все импорты модуля: `import … from "x"`, `import "x"`, `export … from "x"`,
 * `import("x")` и `require("x")`. Type-only импорты тоже считаются: в экспортированном
 * проекте типы должны разрешаться так же, как и значения.
 * @param {string} src
 * @returns {{ spec: string; dynamic: boolean }[]}
 */
export function scanImports(src) {
  const tokens = tokenize(src);
  const found = [];
  for (let k = 0; k < tokens.length; k += 1) {
    const tk = tokens[k];
    const next = tokens[k + 1];
    const afterNext = tokens[k + 2];
    if (tk.t !== "word") continue;
    if ((tk.v === "from" || tk.v === "import") && next?.t === "str") {
      found.push({ spec: next.v, dynamic: Boolean(next.dynamic) });
    } else if ((tk.v === "import" || tk.v === "require") && next?.v === "(" && afterNext?.t === "str") {
      found.push({ spec: afterNext.v, dynamic: Boolean(afterNext.dynamic) });
    }
  }
  return found;
}

/** Имя npm-пакета из спецификатора: `react-dom/server` → `react-dom`, `@a/b/c` → `@a/b`. */
export function packageName(spec) {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * Разрешает относительный импорт в существующий файл или возвращает null.
 * @param {string} fromFile абсолютный путь импортирующего файла
 * @param {string} spec относительный спецификатор
 * @param {(p: string) => boolean} isFile
 */
export function resolveRelative(fromFile, spec, isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile()) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, ...EXTENSIONS.map((e) => base + e), ...EXTENSIONS.map((e) => path.join(base, "index" + e))];
  return candidates.find(isFile) ?? null;
}

const isInside = (root, file) => {
  const rel = path.relative(root, file);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

/**
 * Обходит граф импортов от входных файлов и собирает нарушения самодостаточности.
 *
 * @param {object} opts
 * @param {string[]} opts.entries абсолютные пути входных файлов
 * @param {string} opts.root абсолютный путь папки, за пределы которой шаблон выходить не вправе (src/site-templates)
 * @param {string[]} opts.allowedPackages npm-пакеты, доступные в экспортированном проекте
 * @param {string[]} [opts.studioFiles] абсолютные пути слоя витрины студии внутри root (реестр, демо-тексты)
 * @param {(p: string) => string} [opts.read] чтение файла (подменяется в тестах)
 * @param {(p: string) => boolean} [opts.isFile] проверка существования (подменяется в тестах)
 * @returns {{ files: string[]; violations: { file: string; spec: string; reason: string }[] }}
 */
export function checkImportGraph({ entries, root, allowedPackages, studioFiles = [], read = (p) => fs.readFileSync(p, "utf8"), isFile }) {
  const allowed = new Set(allowedPackages);
  const studio = new Set(studioFiles);
  const seen = new Set();
  const queue = [...entries];
  const violations = [];

  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const { spec, dynamic } of scanImports(read(file))) {
      if (dynamic) {
        violations.push({ file, spec, reason: "dynamic-specifier" });
        continue;
      }
      if (spec.startsWith(".")) {
        const target = resolveRelative(file, spec, isFile);
        if (!target) {
          violations.push({ file, spec, reason: "unresolved" });
        } else if (!isInside(root, target)) {
          violations.push({ file, spec, reason: "outside-root" });
        } else if (studio.has(target)) {
          violations.push({ file, spec, reason: "studio-layer" });
        } else if (/\.(ts|tsx|mts|js|jsx|mjs)$/.test(target)) {
          queue.push(target);
        }
        continue;
      }
      if (spec.startsWith("@/") || spec === "@") {
        violations.push({ file, spec, reason: "studio-alias" });
        continue;
      }
      if (spec.startsWith("node:") || !allowed.has(packageName(spec))) {
        violations.push({ file, spec, reason: "package-not-allowed" });
      }
    }
  }

  return { files: [...seen].sort(), violations };
}

/** Человекочитаемое описание нарушения. */
export function describeViolation(v, cwd = process.cwd()) {
  const reasons = {
    "outside-root": "импорт за пределами src/site-templates",
    "studio-alias": "импорт через алиас студии (@/…)",
    "studio-layer": "импорт слоя витрины студии (реестр/демо-тексты)",
    "package-not-allowed": "пакет, которого нет в экспортированном проекте",
    "dynamic-specifier": "динамический import() — граф не проанализировать",
    unresolved: "файл не найден",
  };
  return `${path.relative(cwd, v.file)}: «${v.spec}» — ${reasons[v.reason] ?? v.reason}`;
}
