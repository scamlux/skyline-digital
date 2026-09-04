import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { ProjectsAdmin, type ProjectRow } from "./ProjectsAdmin";

export const dynamic = "force-dynamic";

export default async function ProjectsAdminPage() {
  if (!isSupabaseConfigured()) return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("projects")
    .select(
      "id,slug,title,category,description,image,technologies,year,url,published,sort,client,role,brief,solution,result,metrics,gallery",
    )
    .order("sort", { ascending: true })
    .order("year", { ascending: false });

  const rows = (data ?? []).map((r) => ({
    ...r,
    description: r.description ?? "",
    image: r.image ?? "",
    technologies: Array.isArray(r.technologies) ? (r.technologies as string[]) : [],
    url: r.url ?? null,
    client: r.client ?? null,
    role: r.role ?? null,
    brief: r.brief ?? null,
    solution: r.solution ?? null,
    result: r.result ?? null,
    metrics: Array.isArray(r.metrics) ? r.metrics : [],
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
  })) as ProjectRow[];

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Проекты (портфолио)</h1>
      <p className="mb-6 text-sm text-gray-500">
        Публичные /projects и главная читают эту таблицу (ISR 60с). Клик по строке — редактирование.
      </p>
      <ProjectsAdmin rows={rows} />
    </div>
  );
}
