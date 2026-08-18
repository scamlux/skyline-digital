import { NextResponse } from "next/server";
import { contactRequestSchema } from "@/lib/validation/contact";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contactRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { name, email, messenger, service, budget, message } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("leads").insert({
      name,
      email,
      messenger: messenger || null,
      service: service || null,
      budget: budget || null,
      message,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Saving contact lead failed");
    return NextResponse.json({ error: "Could not save message" }, { status: 500 });
  }
}
