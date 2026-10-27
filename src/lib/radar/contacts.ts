import type { Presence } from "@/lib/audit/tools/presence";

/**
 * Contacts found on the company's own site, written ONLY into empty fields —
 * never overwrites what a directory or a human already put there.
 */
export function contactsFill(
  c: { instagram: string | null; email: string | null; social_links: string[] | null },
  p?: Presence,
): Record<string, unknown> {
  if (!p) return {};
  const out: Record<string, unknown> = {};
  if (!c.instagram && p.instagram[0]) out.instagram = `https://instagram.com/${p.instagram[0]}`;
  if (!c.email && p.emails[0]) out.email = p.emails[0];
  const links = [
    ...p.instagram.map((h) => `https://instagram.com/${h}`),
    ...p.telegram.map((h) => `https://t.me/${h}`),
    ...p.whatsapp.map((n) => `https://wa.me/${n.replace(/\D/g, "")}`),
    ...p.facebook.map((h) => `https://facebook.com/${h}`),
    ...p.youtube.map((h) => `https://youtube.com/${h}`),
    ...p.tiktok.map((h) => `https://tiktok.com/@${h}`),
  ];
  const existing = c.social_links ?? [];
  const merged = [...new Set([...existing, ...links])].slice(0, 12);
  if (merged.length > existing.length) out.social_links = merged;
  return out;
}
