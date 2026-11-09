import { z } from "zod";
import { decodeDigest, START_PAYLOAD_MAX_LENGTH, DIGEST_FIELDS, type DigestPayload } from "@/site-templates/kit/digest-payload";

/**
 * Разбор апдейта Telegram и команды /start. Всё, что приходит снаружи, проходит через Zod:
 * сам апдейт, текст команды и числа из нагрузки (повторная проверка границ поверх decodeDigest).
 */

/** Только поля, которые нужны боту; остальное Zod отбрасывает (strip) и дальше оно не ходит. */
export const updateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      chat: z.object({ id: z.number().int(), type: z.string().max(32) }),
      text: z.string().max(4096).optional(),
    })
    .optional(),
});

export type TelegramUpdate = z.infer<typeof updateSchema>;

/** `/start`, `/start@имя_бота`, `/start <payload>`; payload — только допустимые символы Telegram. */
const START_COMMAND = new RegExp(`^/start(?:@[A-Za-z0-9_]{1,64})?(?:[ ]+([A-Za-z0-9_-]{1,${START_PAYLOAD_MAX_LENGTH}}))?$`);

const payloadSchema = z.discriminatedUnion("tpl", [
  z.object({ tpl: z.literal("restaurant"), values: boundedValues("restaurant") }),
  z.object({ tpl: z.literal("clinic"), values: boundedValues("clinic") }),
  z.object({ tpl: z.literal("salon"), values: boundedValues("salon") }),
  z.object({ tpl: z.literal("cafe"), values: boundedValues("cafe") }),
]);

function boundedValues(tpl: keyof typeof DIGEST_FIELDS) {
  const shape = Object.fromEntries(Object.entries(DIGEST_FIELDS[tpl]).map(([k, max]) => [k, z.number().int().min(0).max(max)]));
  return z.object(shape);
}

const localeSchema = z.enum(["ru", "en", "uz"]);
const styleSchema = z.enum(["a", "b"]);

/** Текст сообщения → нагрузка сводки или `null` (нет /start, нет payload или payload не прошёл проверку). */
export function digestFromText(text: string | undefined): DigestPayload | null {
  const match = START_COMMAND.exec((text ?? "").trim());
  if (!match?.[1]) return null;
  const decoded = decodeDigest(match[1]);
  if (!decoded) return null;
  const checked = payloadSchema.safeParse(decoded);
  if (!checked.success || !localeSchema.safeParse(decoded.locale).success || !styleSchema.safeParse(decoded.style).success) return null;
  return decoded;
}
