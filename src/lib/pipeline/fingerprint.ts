import { createHash } from "node:crypto";

/**
 * Отпечаток заказа для дедупликации между источниками: один и тот же заказ
 * часто приходит и из ленты, и письмом-оповещением, и репостом в канал.
 * Нормализуем заголовок (регистр, пунктуация, апострофы, цифры номеров
 * лотов остаются) и берём первые 120 символов описания.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’`ʻʼ']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function fingerprint(title: string, description: string): string {
  const key = `${normalize(title)}|${normalize(description).slice(0, 120)}`;
  return createHash("sha1").update(key).digest("hex").slice(0, 20);
}
