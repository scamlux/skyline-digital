import type { SupabaseClient } from "@supabase/supabase-js";
import { signedRenderUrls, type ContentPostRow } from "./store";

/**
 * Публикация в Instagram (ПРОМПТ-3 §1.4) через Content Publishing API.
 *
 * Два шага: POST /<IG_ID>/media создаёт контейнер → POST /<IG_ID>/media_publish
 * публикует по creation_id. Карусель: контейнер на каждую картинку с
 * is_carousel_item=true, затем родительский media_type=CAROUSEL + children
 * (максимум 10). Сторис: media_type=STORIES, одна картинка.
 *
 * Картинки только JPEG (наш рендер отдаёт .jpg) и должны лежать на публично
 * доступном URL на момент забора: подписанный URL Storage с TTL ≥ 30 минут —
 * Meta забирает файл асинхронно.
 *
 * Секреты: INSTAGRAM_BUSINESS_ID + INSTAGRAM_ACCESS_TOKEN (только на сервере).
 */

const IG_ID = process.env.INSTAGRAM_BUSINESS_ID;
const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const VERSION = process.env.INSTAGRAM_GRAPH_VERSION || "v21.0";
const GRAPH = "https://graph.facebook.com";
const SIGNED_TTL = 1800; // ≥ 30 минут: Meta забирает медиа асинхронно.
const MAX_CAROUSEL = 10;

export function isInstagramConfigured(): boolean {
  return Boolean(IG_ID && TOKEN);
}

interface GraphError {
  message?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

function throwGraph(where: string, status: number, err?: GraphError): never {
  const code = err?.code ?? status;
  const sub = err?.error_subcode ? `/${err.error_subcode}` : "";
  throw new Error(`IG ${where}: ${code}${sub} ${err?.message ?? "unknown error"}`);
}

async function graphPost(path: string, params: Record<string, string>): Promise<{ id: string }> {
  const body = new URLSearchParams({ ...params, access_token: TOKEN! });
  const res = await fetch(`${GRAPH}/${VERSION}/${path}`, { method: "POST", body });
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: GraphError };
  if (!res.ok || json.error || !json.id) throwGraph(path, res.status, json.error);
  return { id: json.id! };
}

async function graphGet(path: string, fields: string): Promise<Record<string, unknown>> {
  const q = new URLSearchParams({ fields, access_token: TOKEN! });
  const res = await fetch(`${GRAPH}/${VERSION}/${path}?${q}`);
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

/**
 * Ждём, пока контейнер станет FINISHED (Meta обрабатывает медиа асинхронно).
 * Best-effort: если статус-эндпоинт недоступен — не блокируем публикацию.
 */
async function waitContainerReady(creationId: string): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const info = await graphGet(creationId, "status_code");
    const status = info.status_code as string | undefined;
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new Error(`IG контейнер ${creationId}: статус ${status}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  // По таймауту всё равно пробуем опубликовать — media_publish вернёт причину.
}

export async function publishToInstagram(
  db: SupabaseClient,
  post: ContentPostRow,
): Promise<{ ok: boolean; permalink?: string; error?: string }> {
  if (!isInstagramConfigured()) {
    return { ok: false, error: "INSTAGRAM_BUSINESS_ID / INSTAGRAM_ACCESS_TOKEN не заданы" };
  }

  // Идемпотентность: уже опубликовано → выходим (уникальный индекс в БД —
  // вторая линия обороны против дублей при «Повторить»).
  const { data: prev } = await db
    .from("content_publications")
    .select("id")
    .eq("post_id", post.id)
    .eq("platform", "instagram")
    .eq("status", "published")
    .maybeSingle();
  if (prev) return { ok: false, error: "уже опубликовано в instagram" };

  const { data: pub } = await db
    .from("content_publications")
    .insert({ post_id: post.id, platform: "instagram", status: "pending" })
    .select("id")
    .single();
  const pubId = (pub as { id: string }).id;

  try {
    const urls = await signedRenderUrls(db, post, SIGNED_TTL);
    if (!urls.length) throw new Error("нет рендеров — сначала отрендерить");
    const caption = (post.caption.instagram ?? post.caption.default ?? "").trim();
    const isStory = post.format === "story";

    let creationId: string;
    if (isStory) {
      // Сторис: одна картинка, без карусели и подписи.
      creationId = (await graphPost(`${IG_ID}/media`, { media_type: "STORIES", image_url: urls[0] })).id;
    } else if (urls.length === 1) {
      creationId = (await graphPost(`${IG_ID}/media`, { image_url: urls[0], caption })).id;
    } else {
      if (urls.length > MAX_CAROUSEL) {
        throw new Error(`карусель ${urls.length} > ${MAX_CAROUSEL} элементов — Instagram не примет`);
      }
      const children: string[] = [];
      for (const url of urls) {
        const child = await graphPost(`${IG_ID}/media`, { image_url: url, is_carousel_item: "true" });
        children.push(child.id);
      }
      creationId = (
        await graphPost(`${IG_ID}/media`, {
          media_type: "CAROUSEL",
          children: children.join(","),
          caption,
        })
      ).id;
    }

    await waitContainerReady(creationId);
    const published = await graphPost(`${IG_ID}/media_publish`, { creation_id: creationId });
    const mediaId = published.id;

    let permalink: string | undefined;
    try {
      const info = await graphGet(mediaId, "permalink");
      permalink = info.permalink as string | undefined;
    } catch {
      /* permalink не критичен */
    }

    await db
      .from("content_publications")
      .update({
        status: "published",
        external_id: String(mediaId),
        permalink,
        published_at: new Date().toISOString(),
      })
      .eq("id", pubId);
    return { ok: true, permalink };
  } catch (e) {
    // Ошибку Meta пишем целиком (код + сообщение) — для кнопки «Повторить».
    await db
      .from("content_publications")
      .update({ status: "failed", error: String(e) })
      .eq("id", pubId);
    return { ok: false, error: String(e) };
  }
}
