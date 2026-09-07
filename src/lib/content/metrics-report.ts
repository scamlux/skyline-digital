/**
 * Свод метрик по рубрикам (ПРОМПТ-3 §1.7). Правило из QA.md: если по рубрике
 * три поста подряд ниже медианы — они подсвечиваются красным (рубрика умирает).
 * Чистые функции — покрыты тестом.
 */

export interface MetricRow {
  postId: string;
  slug: string;
  title: string;
  rubric: string | null;
  scheduledAt: string | null;
  views: number | null;
  saves: number | null;
  shares: number | null;
  comments: number | null;
}

export interface ReportRow extends MetricRow {
  belowMedian: boolean;
  flaggedRed: boolean;
}

export interface RubricReport {
  rubric: string;
  medianViews: number;
  posts: ReportRow[];
}

export function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function buildRubricReports(rows: MetricRow[]): RubricReport[] {
  const groups = new Map<string, MetricRow[]>();
  for (const r of rows) {
    const key = r.rubric ?? "—";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const reports: RubricReport[] = [];
  for (const [rubric, list] of groups) {
    const ordered = [...list].sort((a, b) =>
      (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""),
    );
    const med = median(ordered.map((r) => r.views ?? 0));
    const below = ordered.map((r) => (r.views ?? 0) < med);

    // Красным — посты внутри серии из 3+ подряд ниже медианы.
    const flagged = new Array<boolean>(below.length).fill(false);
    let run = 0;
    for (let i = 0; i < below.length; i++) {
      if (below[i]) {
        run++;
        if (run >= 3) for (let k = i; k > i - run; k--) flagged[k] = true;
      } else {
        run = 0;
      }
    }

    reports.push({
      rubric,
      medianViews: med,
      posts: ordered.map((r, i) => ({ ...r, belowMedian: below[i], flaggedRed: flagged[i] })),
    });
  }
  return reports.sort((a, b) => a.rubric.localeCompare(b.rubric));
}
