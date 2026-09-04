import { notFound } from "next/navigation";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { CANVAS, type PostFormat } from "@/lib/content/types";
import type { ContentPostRow } from "@/lib/content/store";
import { Editor } from "../Editor";

export const dynamic = "force-dynamic";

export default async function ContentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  const db = getSupabaseAdmin();
  const { data } = await db.from("content_posts").select("*").eq("id", id).single();
  if (!data) notFound();
  const post = data as ContentPostRow;
  const { w, h } = CANVAS[post.format as PostFormat] ?? CANVAS.post;

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{post.title}</h1>
      <Editor
        id={post.id}
        initialJson={JSON.stringify(post.spec, null, 2)}
        status={post.status}
        scheduledAt={post.scheduled_at}
        guard={post.guard ?? []}
        aspect={h / w}
      />
    </div>
  );
}
