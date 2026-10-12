import type { RawOpportunity } from "../types";
import { htmlToText, toIso } from "./util";

/**
 * Freelancehunt API v2 (JSON:API). Нужен личный токен из профиля
 * (FREELANCEHUNT_TOKEN) — без него источник пропускается. Только чтение
 * ленты проектов по навыкам профиля; ставки делает владелец руками.
 */

interface FhProject {
  id?: number | string;
  attributes?: {
    name?: string;
    description?: string;
    description_html?: string;
    budget?: { amount?: number; currency?: string } | null;
    published_at?: string;
    expired_at?: string;
    skills?: { name?: string }[];
    employer?: { login?: string } | null;
  };
  links?: { self?: { web?: string } };
}

export function parseFreelancehunt(payload: unknown): RawOpportunity[] {
  const data = (payload as { data?: FhProject[] })?.data ?? [];
  const out: RawOpportunity[] = [];
  for (const p of data) {
    const a = p?.attributes;
    if (p?.id == null || !a?.name) continue;
    const amount = a.budget?.amount ?? null;
    out.push({
      source: "freelancehunt",
      externalId: String(p.id),
      url: p.links?.self?.web ?? `https://freelancehunt.com/project/${p.id}.html`,
      title: a.name.trim(),
      description: htmlToText(a.description_html ?? a.description ?? ""),
      buyer: a.employer?.login ?? null,
      budgetMin: amount,
      budgetMax: amount,
      currency: a.budget?.currency ?? null,
      deadline: toIso(a.expired_at),
      publishedAt: toIso(a.published_at),
      tags: (a.skills ?? []).map((s) => s.name).filter((s): s is string => Boolean(s)),
    });
  }
  return out;
}

export async function collectFreelancehunt(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RawOpportunity[]> {
  const res = await fetchImpl("https://api.freelancehunt.com/v2/projects?filter[only_my_skills]=1", {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`freelancehunt: HTTP ${res.status}`);
  return parseFreelancehunt(await res.json());
}
