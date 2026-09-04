import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { parseBrief } from "@/lib/ai/brief";

// Touchpoint A (§8): разбор описания клиента. За rate limit — публичный
// AI-роут; без лимита ключ выжигается за ночь (§11 мастер-ТЗ).
export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  projectType: z.enum(["website", "webApp", "mobileApp", "ai", "automation", "uiux", "other"]),
  description: z.string().trim().min(20).max(4000),
  features: z.array(z.string()).default([]),
  addons: z.array(z.string()).default([]),
});

export async function POST(req: Request): Promise<NextResponse> {
  const ip = clientIp(req);
  const allowed = await rateLimit(`brief:${ip}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const brief = await parseBrief({
      projectType: body.projectType,
      description: body.description,
      selectedFeatures: body.features,
      selectedAddons: body.addons,
    });
    return NextResponse.json(brief);
  } catch {
    // Фолбэк без ИИ: калькулятор работает и так — просто без подсказок.
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }
}
