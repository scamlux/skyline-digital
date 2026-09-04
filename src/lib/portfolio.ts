import "server-only";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { projects as codeProjects, type Project, type ProjectMetric } from "@/data/projects";

/**
 * Portfolio loader: DB-backed (admin-managed) with the code catalog as a
 * fallback so the public site never renders empty if the table is unreachable.
 */
export async function getProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return codeProjects;
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("projects")
      .select(
        "slug,title,category,description,image,technologies,year,url,client,role,brief,solution,result,metrics,gallery",
      )
      .eq("published", true)
      .order("sort", { ascending: true })
      .order("year", { ascending: false });
    if (error || !data || data.length === 0) return codeProjects;
    return data.map((r) => ({
      slug: r.slug,
      title: r.title,
      category: (r.category ?? "web") as Project["category"],
      description: r.description ?? "",
      image: r.image ?? "/projects/placeholder.jpg",
      technologies: Array.isArray(r.technologies) ? (r.technologies as string[]) : [],
      year: r.year ?? new Date().getFullYear(),
      url: r.url ?? undefined,
      client: r.client ?? undefined,
      role: r.role ?? undefined,
      brief: r.brief ?? undefined,
      solution: r.solution ?? undefined,
      result: r.result ?? undefined,
      metrics: Array.isArray(r.metrics) ? (r.metrics as ProjectMetric[]) : [],
      gallery: Array.isArray(r.gallery) ? (r.gallery as string[]) : [],
    }));
  } catch {
    return codeProjects;
  }
}

export async function getProject(slug: string): Promise<Project | null> {
  const all = await getProjects();
  return all.find((p) => p.slug === slug) ?? null;
}

/** Read a settings value (jsonb) with a fallback. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (!isSupabaseConfigured()) return fallback;
  try {
    const db = getSupabaseAdmin();
    const { data } = await db.from("settings").select("value").eq("key", key).single();
    return data ? (data.value as T) : fallback;
  } catch {
    return fallback;
  }
}
