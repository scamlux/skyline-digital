const GRADE_COLOR: Record<string, string> = {
  A: "#10b981", // green — hot
  B: "#f59e0b", // amber — warm
  C: "#6b7480", // grey — cold
};

export function CellGrade({ grade }: { grade: string | null }) {
  const color = GRADE_COLOR[grade ?? ""] ?? "#9ca3af";
  return (
    <span
      className="inline-flex min-w-[28px] justify-center rounded px-2 py-0.5 text-xs font-bold"
      style={{ background: `${color}22`, color }}
    >
      {grade ?? "—"}
    </span>
  );
}
