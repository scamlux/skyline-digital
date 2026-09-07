import { describe, it, expect } from "vitest";
import { median, buildRubricReports, type MetricRow } from "./metrics-report";

const row = (i: number, rubric: string, views: number): MetricRow => ({
  postId: `p${i}`,
  slug: `s${i}`,
  title: `t${i}`,
  rubric,
  scheduledAt: `2026-09-${String(i).padStart(2, "0")}T05:00:00.000Z`,
  views,
  saves: null,
  shares: null,
  comments: null,
});

describe("metrics-report", () => {
  it("median нечётного и чётного", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("три поста подряд ниже медианы → красным", () => {
    // Разбор: 100, 90, 10, 20, 30 → медиана 30; хвост 10,20 ниже, но подряд только 2 → не красим.
    // Добавим ещё один ниже, чтобы получить серию 3.
    const rows = [
      row(1, "Разбор", 100),
      row(2, "Разбор", 90),
      row(3, "Разбор", 80),
      row(4, "Разбор", 10),
      row(5, "Разбор", 20),
      row(6, "Разбор", 25),
    ];
    const [rep] = buildRubricReports(rows);
    expect(rep.rubric).toBe("Разбор");
    // медиана из [100,90,80,10,20,25] = (25+80)/2? отсортировано:10,20,25,80,90,100 → (25+80)/2=52.5
    expect(rep.medianViews).toBe(52.5);
    const flagged = rep.posts.filter((p) => p.flaggedRed).map((p) => p.postId);
    // посты 4,5,6 (10,20,25) — три подряд ниже 52.5
    expect(flagged.sort()).toEqual(["p4", "p5", "p6"]);
  });

  it("две подряд ниже медианы — НЕ красным", () => {
    const rows = [row(1, "Радар", 100), row(2, "Радар", 90), row(3, "Радар", 10), row(4, "Радар", 20)];
    const [rep] = buildRubricReports(rows);
    expect(rep.posts.every((p) => !p.flaggedRed)).toBe(true);
  });

  it("группирует по рубрикам", () => {
    const reps = buildRubricReports([row(1, "Разбор", 50), row(2, "Радар", 70)]);
    expect(reps.map((r) => r.rubric)).toEqual(["Радар", "Разбор"]);
  });
});
