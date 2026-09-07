/**
 * Импорт месячного плана в БД студии (ПРОМПТ-3 §1.3).
 *
 *   npm run content:import           # импорт в Supabase (нужны env)
 *   npm run content:import -- --dry  # только маппинг+валидация, без БД
 *
 * Запускается через tsx (см. package.json), поэтому .mjs свободно импортирует
 * TypeScript-модуль src/lib/content/import-plan.ts. Идемпотентно: повторный
 * запуск не плодит дубли и не трогает approved/scheduled/published.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { importPlan, planToSpec } from "../../src/lib/content/import-plan.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const PLAN_PATH = resolve(ROOT, "docs/smm/content-plan-2026-09.json");
const DRY = process.argv.includes("--dry");

function loadEnvLocal() {
  for (const f of [".env.local", ".env"]) {
    try {
      const txt = readFileSync(resolve(ROOT, f), "utf8");
      for (const line of txt.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      /* нет файла — не страшно */
    }
  }
}

const plan = JSON.parse(readFileSync(PLAN_PATH, "utf8"));

if (DRY) {
  let ok = 0;
  let bad = 0;
  for (const p of plan.posts) {
    try {
      const spec = planToSpec(p);
      ok++;
      console.log(`  · ${p.id} → ${spec.slides.length} слайд(ов), ${spec.platforms.join("/")}`);
    } catch (e) {
      bad++;
      console.error(`  ✗ ${p.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\nDRY: спеки валидны ${ok}/${plan.posts.length}, ошибок ${bad}`);
  process.exit(bad ? 1 : 0);
}

loadEnvLocal();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (или задайте --dry).");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const report = await importPlan(db, plan);

console.log(
  `Импорт: создано ${report.created}, обновлено ${report.updated}, ` +
    `пропущено ${report.skipped}, ошибок ${report.errors}`,
);
for (const r of report.rows) {
  if (r.action === "error") console.error(`  ✗ ${r.slug}: ${r.error}`);
  else {
    const mark = r.action === "created" ? "+" : r.action === "updated" ? "~" : "·";
    console.log(`  ${mark} ${r.slug}${r.status ? ` (${r.status})` : ""}`);
  }
}
process.exit(report.errors ? 1 : 0);
