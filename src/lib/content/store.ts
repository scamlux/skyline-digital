import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPost, specHash } from "./build";
import { runGuard, guardBlocks } from "./guard";
import { renderSlides } from "./render";
import { CANVAS, postSpecSchema, type GuardIssue, type PostFormat, type PostSpec } from "./types";

/**
 * Слой БД студии (content_posts / renders / publications, ТЗ §4).
 * Переход review→approved делает ТОЛЬКО человек в админке — здесь такого
 * метода нет намеренно.
 */

export interface ContentPostRow {
  id: string;
  slug: string;
  title: string;
  style: string;
  format: string;
  status: string;
  platforms: string[];
  scheduled_at: string | null;
  spec: PostSpec;
  caption: Record<string, string>;
  hashtags: string[];
  spec_hash: string | null;
  guard: GuardIssue[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Сохранение поста: валидация + guard; blocked при ошибках guard'а. */
export async function savePost(
  db: SupabaseClient,
  id: string | null,
  raw: unknown,
  patch: { status?: string; scheduled_at?: string | null; notes?: string | null } = {},
): Promise<{ ok: boolean; id?: string; issues: GuardIssue[]; error?: string }> {
  let spec: PostSpec;
  try {
    spec = postSpecSchema.parse(raw);
  } catch (e) {
    return { ok: false, issues: [], error: String(e) };
  }
  const issues = runGuard(spec);
  const blocked = guardBlocks(issues);
  const row = {
    slug: spec.slug,
    title: spec.title,
    style: spec.style,
    format: spec.format,
    platforms: spec.platforms,
    spec,
    caption: spec.caption,
    hashtags: spec.hashtags,
    spec_hash: specHash(spec),
    guard: issues,
    ...(blocked ? { status: "blocked" } : patch.status ? { status: patch.status } : {}),
    ...(patch.scheduled_at !== undefined ? { scheduled_at: patch.scheduled_at } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  };
  const q = id
    ? db.from("content_posts").update(row).eq("id", id).select("id").single()
    : db.from("content_posts").insert(row).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false, issues, error: error.message };
  return { ok: true, id: (data as { id: string }).id, issues };
}

/** Рендер поста: PNG → Storage (content/<slug>/NN.png) + content_renders. */
export async function renderPost(
  db: SupabaseClient,
  id: string,
): Promise<{ ok: boolean; slides?: number; error?: string }> {
  const { data } = await db.from("content_posts").select("*").eq("id", id).single();
  if (!data) return { ok: false, error: "post not found" };
  const post = data as ContentPostRow;

  await db.from("content_posts").update({ status: "generating" }).eq("id", id);
  try {
    const built = buildPost(post.spec);
    const pngs = await renderSlides(built.slides, post.format as PostFormat);
    const { w, h } = CANVAS[post.format as PostFormat] ?? CANVAS.post;
    for (let i = 0; i < pngs.length; i++) {
      const path = `${post.slug}/${String(i + 1).padStart(2, "0")}.png`;
      const { error: upErr } = await db.storage
        .from("content")
        .upload(path, pngs[i], { contentType: "image/png", upsert: true });
      if (upErr) throw new Error(`storage: ${upErr.message}`);
      await db.from("content_renders").upsert(
        {
          post_id: id,
          slide_index: i,
          storage_path: `content/${path}`,
          width: w,
          height: h,
          bytes: pngs[i].length,
          spec_hash: built.hash,
        },
        { onConflict: "post_id,slide_index,spec_hash" },
      );
    }
    // После рендера пост уходит на проверку (review) — по ТЗ §4.2.
    await db.from("content_posts").update({ status: "review", spec_hash: built.hash }).eq("id", id);
    return { ok: true, slides: pngs.length };
  } catch (e) {
    await db.from("content_posts").update({ status: "failed" }).eq("id", id);
    return { ok: false, error: String(e) };
  }
}

/** Signed URL картинок последнего рендера (бакет приватный — не открывать). */
export async function signedRenderUrls(
  db: SupabaseClient,
  post: ContentPostRow,
  expiresSec = 3600,
): Promise<string[]> {
  const { data } = await db
    .from("content_renders")
    .select("storage_path, slide_index")
    .eq("post_id", post.id)
    .eq("spec_hash", post.spec_hash ?? "")
    .order("slide_index");
  const rows = (data ?? []) as { storage_path: string; slide_index: number }[];
  const urls: string[] = [];
  for (const r of rows) {
    const path = r.storage_path.replace(/^content\//, "");
    const { data: s } = await db.storage.from("content").createSignedUrl(path, expiresSec);
    if (s?.signedUrl) urls.push(s.signedUrl);
  }
  return urls;
}
