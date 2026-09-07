/**
 * Разовая публикация одного поста в Telegram-канал (обход крона, если прод ещё
 * не задеплоил новый код). Рендерит все слайды в Storage и публикует каруселью.
 *
 *   CH_TOKEN=<бот-админ канала> CH_ID=<-100...> \
 *     npx tsx scripts/content/publish-now.mjs <slug>
 *
 * Env берётся из .env.local (Supabase). Токен канала — только из CH_TOKEN,
 * нигде не сохраняется.
 */
import { readFileSync } from "node:fs";
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
process.env.TELEGRAM_CHANNEL_BOT_TOKEN = process.env.CH_TOKEN;
process.env.TELEGRAM_CHANNEL_ID = process.env.CH_ID;
const slug = process.argv[2];
if (!slug) { console.error("Укажи slug: npx tsx scripts/content/publish-now.mjs <slug>"); process.exit(1); }
if (!process.env.CH_TOKEN || !process.env.CH_ID) { console.error("Нужны CH_TOKEN и CH_ID"); process.exit(1); }
const { createClient } = await import("@supabase/supabase-js");
const { renderPost } = await import("../../src/lib/content/store.ts");
const { publishToTelegram } = await import("../../src/lib/content/publish-telegram.ts");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: post } = await db.from("content_posts").select("*").eq("slug", slug).single();
if (!post) { console.error("Пост не найден:", slug); process.exit(1); }
console.log("Рендерю", post.slug, "…");
const r = await renderPost(db, post.id);
console.log("render:", JSON.stringify(r));
if (!r.ok) process.exit(1);
const { data: fresh } = await db.from("content_posts").select("*").eq("id", post.id).single();
console.log("Публикую в канал…");
console.log("publish:", JSON.stringify(await publishToTelegram(db, fresh)));
