/**
 * Radar CLI — discover, score and store company leads.
 *
 *   npm run radar -- [options]
 *     --all                 scan all industries (default)
 *     --industry <name>     dentistry | auto | beauty
 *     --collector <name>    google | yandex | yellowpages | gigal | olx | 2gis
 *     --region <code>       uz (default) | kz | tj
 *     --dry-run             parse + score, don't write to the DB
 *     --stats               show DB counts by industry/grade, then exit
 *     --help                this help
 *
 * Runs via tsx (see package.json "radar"). API collectors need
 * GOOGLE_MAPS_API_KEY / YANDEX_MAPS_API_KEY; they skip gracefully if absent.
 */
import { orchestrate } from "../../src/lib/radar/orchestrate";
import { getRadarDb, isRadarDbConfigured } from "../../src/lib/radar/db";
import { getStats } from "../../src/lib/radar/store";
import {
  INDUSTRIES,
  RADAR_SOURCES,
  type Industry,
  type RadarSource,
  type Region,
} from "../../src/lib/radar/types";

interface Args {
  all: boolean;
  industry?: Industry;
  collector?: RadarSource;
  region: Region;
  dryRun: boolean;
  stats: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { all: false, region: "uz", dryRun: false, stats: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--all") a.all = true;
    else if (v === "--dry-run") a.dryRun = true;
    else if (v === "--stats") a.stats = true;
    else if (v === "--help" || v === "-h") a.help = true;
    else if (v === "--industry") a.industry = argv[++i] as Industry;
    else if (v === "--collector") a.collector = argv[++i] as RadarSource;
    else if (v === "--region") a.region = argv[++i] as Region;
  }
  return a;
}

const HELP = `Radar CLI
  npm run radar -- --all
  npm run radar -- --industry dentistry
  npm run radar -- --collector google --industry beauty --dry-run
  npm run radar -- --stats

Options: --all --industry <dentistry|auto|beauty> --collector <google|yandex|yellowpages|gigal|olx|2gis>
         --region <uz|kz|tj> --dry-run --stats --help`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  const db = isRadarDbConfigured() ? getRadarDb() : null;

  if (args.stats) {
    if (!db) {
      console.error("No Supabase env — cannot show stats.");
      process.exit(1);
    }
    const s = await getStats(db);
    console.log(`\nRadar DB — ${s.total} companies`);
    console.log(`  Grades: A=${s.byGrade.A}  B=${s.byGrade.B}  C=${s.byGrade.C}`);
    for (const [ind, n] of Object.entries(s.byIndustry)) console.log(`  ${ind}: ${n}`);
    return;
  }

  if (args.industry && !INDUSTRIES.includes(args.industry)) {
    console.error(`Unknown industry: ${args.industry} (${INDUSTRIES.join(", ")})`);
    process.exit(1);
  }
  if (args.collector && !RADAR_SOURCES.includes(args.collector)) {
    console.error(`Unknown collector: ${args.collector} (${RADAR_SOURCES.join(", ")})`);
    process.exit(1);
  }

  const industries = args.industry ? [args.industry] : INDUSTRIES;
  const sources = args.collector ? [args.collector] : RADAR_SOURCES;

  if (!db && !args.dryRun) {
    console.warn("No Supabase env — forcing --dry-run (nothing will be written).");
    args.dryRun = true;
  }

  console.log(
    `Radar: sources=[${sources.join(",")}] industries=[${industries.join(",")}] region=${args.region} ${args.dryRun ? "(dry-run)" : "(live)"}`,
  );

  const summaries = await orchestrate({
    sources,
    industries,
    region: args.region,
    dryRun: args.dryRun,
    db,
    log: (m) => console.log(m),
  });

  let total = 0;
  const grand = { A: 0, B: 0, C: 0 };
  let created = 0;
  let updated = 0;
  for (const s of summaries) {
    total += s.unique;
    grand.A += s.grades.A;
    grand.B += s.grades.B;
    grand.C += s.grades.C;
    created += s.new;
    updated += s.updated;
  }
  console.log(
    `\nTotal: ${total} unique (A=${grand.A} B=${grand.B} C=${grand.C})` +
      (args.dryRun ? " · dry-run, not written" : ` · ${created} new / ${updated} updated`),
  );
}

main().catch((err) => {
  console.error("Radar CLI failed:", err);
  process.exit(1);
});
