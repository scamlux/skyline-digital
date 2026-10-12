import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createLead } from "@/lib/leads";
import { editTelegramKeyboard, esc, sendTelegramMessage, sendTelegramWithKeyboard } from "@/lib/telegram";
import { ACTION_STATUS, formatDraftMessage, keyboardFor, type CardAction } from "./card";
import { typeLabelRu } from "./labels";
import type { OpportunityRow } from "./types";

/**
 * Единая точка решений владельца — кнопки в Telegram и админка зовут одно и
 * то же. «Выиграли» превращает возможность в заявку (leads) с ценой движка
 * и сводкой — дальше обычный путь студии: КП, договор, работа.
 */

export interface ActionResult {
  ok: boolean;
  message: string;
  row?: OpportunityRow;
}

async function load(db: SupabaseClient, id: string): Promise<OpportunityRow | null> {
  const { data } = await db.from("opportunities").select("*").eq("id", id).maybeSingle();
  return (data as OpportunityRow | null) ?? null;
}

export async function sendDraft(row: OpportunityRow): Promise<void> {
  if (!row.draft) {
    await sendTelegramMessage(`Для «${esc(row.title)}» черновика нет — оценка не дошла до этапа текста.`);
    return;
  }
  await sendTelegramMessage(formatDraftMessage(row, row.draft));
}

async function convertToLead(db: SupabaseClient, row: OpportunityRow): Promise<string | null> {
  if (row.lead_id) return null;
  const q = row.qualification;
  const contact = q?.contact ?? "";
  const lead = await createLead(db, {
    client_name: row.buyer ?? undefined,
    email: contact.includes("@") && !contact.startsWith("@") ? contact : "",
    telegram: contact.startsWith("@") ? contact : undefined,
    project_type: row.quote?.projectType,
    description: `${row.title}\n\n${row.description}`.slice(0, 8000),
    source: `pipeline:${row.source}`,
    landing_page: row.url ?? undefined,
    ai_summary: q?.summary,
    calculated_price: row.quote ? Math.round((row.quote.totalMin + row.quote.totalMax) / 2) : undefined,
    currency: row.quote ? "USD" : undefined,
    deadline: row.deadline ?? undefined,
  });
  await db.from("opportunities").update({ lead_id: lead.id }).eq("id", row.id);
  return lead.lead_number;
}

export async function applyAction(db: SupabaseClient, id: string, action: CardAction): Promise<ActionResult> {
  const row = await load(db, id);
  if (!row) return { ok: false, message: "Возможность не найдена" };

  if (action === "text") {
    await sendDraft(row);
    return { ok: true, message: "Текст отправлен в чат", row };
  }

  const status = ACTION_STATUS[action];
  if (!status) return { ok: false, message: "Неизвестное действие" };
  const { data } = await db
    .from("opportunities")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  const updated = (data as OpportunityRow | null) ?? { ...row, status };

  if (updated.tg_message_id) await editTelegramKeyboard(updated.tg_message_id, keyboardFor(updated));

  if (action === "go") {
    await sendDraft(updated);
    // Карточка могла не уходить в Telegram (решение из админки) — дадим кнопки следующего шага.
    if (!updated.tg_message_id) {
      await sendTelegramWithKeyboard(`✅ Подаёмся: <b>${esc(updated.title)}</b>`, keyboardFor(updated));
    }
    return { ok: true, message: "Подаёмся — текст отклика в чате", row: updated };
  }

  if (action === "won") {
    try {
      const num = await convertToLead(db, updated);
      const price = updated.quote
        ? `$${updated.quote.totalMin}–$${updated.quote.totalMax}, ~${updated.quote.weeks} нед.`
        : "по договорённости";
      await sendTelegramMessage(
        `🏆 <b>Новый проект в работу</b>\n${esc(updated.title)}\n\n` +
          `Тип: ${esc(updated.quote ? typeLabelRu(updated.quote.projectType) : "—")}\nОценка движка: ${esc(price)}\n` +
          (updated.qualification?.deliverables?.length
            ? `Сдаём:\n${updated.qualification.deliverables.map((d) => `• ${esc(d)}`).join("\n")}\n`
            : "") +
          (num ? `\nЗаявка: <b>${esc(num)}</b> — дальше КП и договор из /admin/leads` : ""),
      );
      return { ok: true, message: num ? `Выиграли — заявка ${num}` : "Выиграли", row: updated };
    } catch (err) {
      return { ok: false, message: `Статус сохранён, но заявка не создана: ${String(err)}`, row: updated };
    }
  }

  const labels: Record<string, string> = {
    skip: "Пропущено",
    sent: "Отмечено как отправленное",
    lost: "Отмечено: не взяли",
  };
  return { ok: true, message: labels[action] ?? "Готово", row: updated };
}
