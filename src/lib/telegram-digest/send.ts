/**
 * Отправка сообщения демо-ботом сводок (отдельный бот, не бот заявок из src/lib/telegram.ts).
 * Токен берётся из env в момент вызова и нигде не логируется: ошибки очищаются от токена.
 */

const SEND_TIMEOUT_MS = 8_000;

/** Убирает токен из текста ошибки перед логом. */
export const scrubToken = (text: string, token: string): string => (token ? text.split(token).join("***") : text);

/** Шлёт HTML-сообщение в чат. Не бросает: возвращает `false` и пишет в лог без токена. */
export async function sendDigestMessage(token: string, chatId: number, html: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (res.ok) return true;
    const info = (await res.json().catch(() => null)) as { error_code?: number; description?: string } | null;
    console.error("[telegram-digest] sendMessage failed:", res.status, scrubToken(String(info?.description ?? ""), token));
    return false;
  } catch (err) {
    console.error("[telegram-digest] sendMessage error:", scrubToken(err instanceof Error ? `${err.name}: ${err.message}` : String(err), token));
    return false;
  }
}
