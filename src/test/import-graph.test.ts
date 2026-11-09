import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkImportGraph, packageName, scanImports, tokenize } from "../../scripts/lib/import-graph.mjs";

/** Виртуальная «файловая система» для проверок графа: путь → исходник. */
const ROOT = "/repo/src/site-templates";
function vfs(files: Record<string, string>) {
  const map = new Map(Object.entries(files).map(([k, v]) => [path.join("/repo", k), v]));
  return {
    read: (p: string) => map.get(p) ?? "",
    isFile: (p: string) => map.has(p),
  };
}
const check = (files: Record<string, string>, entry: string) =>
  checkImportGraph({
    entries: [path.join("/repo", entry)],
    root: ROOT,
    allowedPackages: ["react", "react-dom", "next"],
    studioFiles: [`${ROOT}/registry.tsx`, `${ROOT}/demo.ts`],
    ...vfs(files),
  });
const reasons = (r: ReturnType<typeof check>) => r.violations.map((v) => `${v.reason}:${v.spec}`);

describe("scanImports", () => {
  it("находит import from, side-effect import, export from, import() и require()", () => {
    const src = `
      import a from "a";
      import { b } from './b';
      import "./side";
      export * from "../c";
      export { d } from "d/sub";
      const lazy = () => import("./lazy");
      const r = require("node:fs");
    `;
    expect(scanImports(src).map((i) => i.spec)).toEqual(["a", "./b", "./side", "../c", "d/sub", "./lazy", "node:fs"]);
  });

  it("считает type-only импорты и import() в позиции типа", () => {
    const src = `import type { T } from "@/types";\nlet x: import("./store").EventType;`;
    expect(scanImports(src).map((i) => i.spec)).toEqual(["@/types", "./store"]);
  });

  it("не принимает за импорт текст в комментариях и строках", () => {
    const src = `
      // import x from "from-line-comment";
      /* import y from "from-block-comment"; */
      const s = 'import z from "inside-string"';
      const t = \`import w from "inside-template"\`;
      /** @see import("./jsdoc") */
      import real from "real";
    `;
    expect(scanImports(src).map((i) => i.spec)).toEqual(["real"]);
  });

  it("не путает регулярные выражения и JSX-теги со строками", () => {
    const src = `
      const re = /["'\`]/g;
      const split = value.replace(/\\B(?=(\\d{3})+(?!\\d))/g, " ");
      const el = <p>{t("a/b")}</p>;
      import after from "after";
    `;
    expect(scanImports(src).map((i) => i.spec)).toEqual(["after"]);
  });

  it("помечает шаблонную строку с подстановкой в import() как динамическую", () => {
    const [found] = scanImports("const m = await import(`./locales/${lang}`);");
    expect(found).toEqual({ spec: "./locales/", dynamic: true });
  });

  it("токенайзер пропускает вложенные шаблонные строки", () => {
    const tokens = tokenize("const a = `x ${`inner ${1}`} y`; import b from 'b';");
    expect(tokens.filter((t) => t.t === "str").map((t) => t.v)).toEqual(["x  y", "b"]);
  });
});

describe("packageName", () => {
  it("берёт имя пакета без подпути", () => {
    expect(packageName("react-dom/server")).toBe("react-dom");
    expect(packageName("next/dynamic")).toBe("next");
    expect(packageName("@vercel/analytics/next")).toBe("@vercel/analytics");
  });
});

describe("checkImportGraph", () => {
  it("пропускает самодостаточный шаблон: react, next/dynamic и свои файлы", () => {
    const r = check(
      {
        "src/site-templates/cafe/Cafe.tsx": `import { useState } from "react"; import dynamic from "next/dynamic"; import { pick } from "../types"; import { ui } from "./ui";`,
        "src/site-templates/cafe/ui.ts": `import type { L } from "../types";`,
        "src/site-templates/types.ts": `export const pick = 1;`,
      },
      "src/site-templates/cafe/Cafe.tsx",
    );
    expect(r.violations).toEqual([]);
    expect(r.files.map((f) => path.relative(ROOT, f))).toEqual(["cafe/Cafe.tsx", "cafe/ui.ts", "types.ts"]);
  });

  it("ловит импорт через алиас студии и пакеты, которых нет в проекте клиента", () => {
    const r = check(
      { "src/site-templates/a/A.tsx": `import { x } from "@/lib/seo"; import { useTranslations } from "next-intl"; import { Analytics } from "@vercel/analytics/next"; import fs from "node:fs";` },
      "src/site-templates/a/A.tsx",
    );
    expect(reasons(r)).toEqual(["studio-alias:@/lib/seo", "package-not-allowed:next-intl", "package-not-allowed:@vercel/analytics/next", "package-not-allowed:node:fs"]);
  });

  it("ловит относительный выход за пределы src/site-templates", () => {
    const r = check(
      {
        "src/site-templates/a/A.tsx": `import { x } from "../../lib/x";`,
        "src/lib/x.ts": `export const x = 1;`,
      },
      "src/site-templates/a/A.tsx",
    );
    expect(reasons(r)).toEqual(["outside-root:../../lib/x"]);
  });

  it("ловит импорт слоя витрины студии (реестр и демо-тексты)", () => {
    const r = check(
      {
        "src/site-templates/a/A.tsx": `import { TEMPLATES } from "../registry"; import { demoUi } from "../demo";`,
        "src/site-templates/registry.tsx": `export const TEMPLATES = [];`,
        "src/site-templates/demo.ts": `export const demoUi = {};`,
      },
      "src/site-templates/a/A.tsx",
    );
    expect(reasons(r)).toEqual(["studio-layer:../registry", "studio-layer:../demo"]);
  });

  it("сообщает о неразрешённом относительном импорте и о динамическом спецификаторе", () => {
    const r = check({ "src/site-templates/a/A.tsx": "import x from \"./missing\"; const m = import(`./${name}`);" }, "src/site-templates/a/A.tsx");
    expect(reasons(r)).toEqual(["unresolved:./missing", "dynamic-specifier:./"]);
  });

  it("идёт дальше по цепочке: нарушение во вложенном модуле тоже находится", () => {
    const r = check(
      {
        "src/site-templates/a/A.tsx": `import { b } from "./deep/B";`,
        "src/site-templates/a/deep/B.ts": `import { c } from "./C";`,
        "src/site-templates/a/deep/C.ts": `import { routing } from "@/i18n/routing";`,
      },
      "src/site-templates/a/A.tsx",
    );
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0]).toMatchObject({ reason: "studio-alias", spec: "@/i18n/routing" });
    expect(r.violations[0].file.endsWith("deep/C.ts")).toBe(true);
  });

  it("не зацикливается на циклических импортах", () => {
    const r = check(
      {
        "src/site-templates/a/A.ts": `import "./B";`,
        "src/site-templates/a/B.ts": `import "./A";`,
      },
      "src/site-templates/a/A.ts",
    );
    expect(r.violations).toEqual([]);
    expect(r.files).toHaveLength(2);
  });
});

describe("реальные шаблоны в репозитории", () => {
  const repoRoot = path.resolve(__dirname, "../..");
  const templatesRoot = path.join(repoRoot, "src/site-templates");

  const listSources = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (/ \d+(\.[^./]+)?$/.test(e.name)) return []; // дубли iCloud вида «file 2.ts»
      if (e.isDirectory()) return listSources(p);
      return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
    });

  it.each(["restaurant", "clinic", "salon", "cafe"])("шаблон «%s» самодостаточен: импорты только внутри src/site-templates", (id) => {
    const entries = [...listSources(path.join(templatesRoot, id)), ...listSources(path.join(templatesRoot, "kit")), path.join(templatesRoot, "types.ts")];
    const { violations } = checkImportGraph({
      entries,
      root: templatesRoot,
      allowedPackages: ["react", "react-dom", "next"],
      studioFiles: [path.join(templatesRoot, "registry.tsx"), path.join(templatesRoot, "demo.ts")],
    });
    expect(violations).toEqual([]);
  });
});
