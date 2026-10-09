import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { extractOpportunities } from "@/lib/pipeline/ai";
import { ingestNow } from "@/lib/pipeline/run";

/**
 * Приём писем-оповещений площадок (Upwork, UNGM Tender Alert, Workspace,
 * Freelancehunt, рассылки Всемирного банка…). Любой пересыльщик — Google
 * Apps Script из Gmail, Zapier, Cloudflare Email Worker — шлёт сюда JSON.
 * ИИ разрезает письмо на отдельные заказы, дальше обычный путь конвейера.
 *
 * Защита: Bearer PIPELINE_INGEST_SECRET (без него роут закрыт), zod на входе.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  subject: z.string().max(1000).optional().nullable(),
  text: z.string().min(1).max(100_000),
  url: z.string().url().max(2000).optional().nullable(),
  from: z.string().max(500).optional().nullable(),
  /** Метка канала для дедупа, напр. message-id письма. */
  id: z.string().max(500).optional().nullable(),
});

function authorized(req: Request): boolean {
  const secret = process.env.PIPELINE_INGEST_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "supabase not configured" }, { status: 503 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const b = parsed.data;

  const items = await extractOpportunities({ subject: b.subject, text: b.text, url: b.url, from: b.from });
  const base = b.id ?? createHash("sha1").update(`${b.subject ?? ""}|${b.text}`).digest("hex").slice(0, 16);
  const stats = await ingestNow(
    getSupabaseAdmin(),
    items.map((it, i) => ({
      ...it,
      source: "ingest" as const,
      // url заказа стабильнее порядкового номера в письме — им и ключуем, когда он есть.
      externalId: it.url ? `url:${createHash("sha1").update(it.url).digest("hex").slice(0, 20)}` : `${base}:${i}`,
      tags: [b.from ?? "ingest"],
    })),
  );
  return NextResponse.json(stats);
}
