"use client";

import { useMemo, useState } from "react";
import { formatSum, pick, type Locale } from "../types";
import { plural } from "../kit/plural";
import { BookButton } from "./client-bits";
import type { MenuCategory, SetPreset } from "./data";
import { fill } from "./format";
import { IconMinus, IconPlus } from "./icons";
import { LatePhoto as Photo } from "./late-photo";
import { MAX_GUESTS, MAX_QTY, MIN_GUESTS, adjustQty, buildSet, clampGuests, dishIndex, liveLines, resolveSet, totalFor, type SetLine } from "./sets";
import { useDemoState } from "./store";
import { guestWords, restaurantUi as ui } from "./ui";

const QUICK_GUESTS = [2, 4, 6, 8, 10];
const DEFAULT_GUESTS = 4;

/**
 * «Что заказать на компанию»: гость выбирает, сколько их, и набор; конструктор подбирает блюда по
 * числу гостей и считает итог со скидкой. Количество блюд можно править. Стоп-лист, цены и скидки
 * берутся из кабинета владельца. «Прийти на это» открывает бронь с этим предзаказом.
 */
export function SetBuilder({ sets, menu, locale }: { sets: SetPreset[]; menu: MenuCategory[]; locale: Locale }) {
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);
  const state = useDemoState();
  const dishes = useMemo(() => dishIndex(menu, state.items), [menu, state.items]);
  const shown = sets.filter((s) => resolveSet(s, state.sets[s.id]).on);

  const [guests, setGuests] = useState(DEFAULT_GUESTS);
  const [pickedId, setPickedId] = useState(sets[0]?.id ?? "");
  // Ручные правки количества живут, пока не сменились гости или набор: тогда набор собирается заново.
  const [edit, setEdit] = useState<{ key: string; lines: SetLine[] } | null>(null);

  const preset = shown.find((s) => s.id === pickedId) ?? shown[0];
  if (!preset) return null;
  const ov = state.sets[preset.id];
  const { discount } = resolveSet(preset, ov);
  const key = `${preset.id}:${guests}`;
  const lines = liveLines(edit?.key === key ? edit.lines : buildSet(preset, guests, dishes, ov), dishes);
  const sum = totalFor(lines, dishes, discount);

  const changeGuests = (n: number) => setGuests(clampGuests(n));
  const changeQty = (id: string, delta: number) => setEdit({ key, lines: adjustQty(lines, id, delta) });

  return (
    <section className="rs-sec rs-setb" id="company" aria-labelledby="sets-title" data-reveal>
      <div className="rs-sec-head">
        <h2 id="sets-title">{t(ui.sets.title)}</h2>
        <p>{t(ui.sets.lead)}</p>
      </div>

      <div className="rs-setb-grid">
        <div className="rs-setb-pick">
          <div className="rs-guests" role="group" aria-label={t(ui.sets.guests)}>
            <span className="rs-guests-label">{t(ui.sets.guests)}</span>
            <div className="rs-stepper big">
              <button type="button" onClick={() => changeGuests(guests - 1)} disabled={guests <= MIN_GUESTS} aria-label={t(ui.sets.less)}>
                <IconMinus />
              </button>
              <output aria-live="polite" data-guests={guests}>
                <b>{guests}</b> <small>{plural(locale, guests, guestWords[locale])}</small>
              </output>
              <button type="button" onClick={() => changeGuests(guests + 1)} disabled={guests >= MAX_GUESTS} aria-label={t(ui.sets.more)}>
                <IconPlus />
              </button>
            </div>
            <div className="rs-quick">
              {QUICK_GUESTS.map((n) => (
                <button key={n} type="button" aria-pressed={guests === n} onClick={() => changeGuests(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="rs-setcards" role="radiogroup" aria-label={t(ui.sets.pick)}>
            {shown.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={s.id === preset.id} className="rs-setcard" onClick={() => setPickedId(s.id)}>
                <span className="rs-setcard-ph">
                  <Photo name={s.photo} src={240} widths={[240, 480]} sizes="(max-width: 640px) 30vw, 14vw" width={480} height={480} loading="lazy" />
                </span>
                <b>{t(s.name)}</b>
                <small>{t(s.blurb)}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="rs-setb-sum" aria-live="polite">
          {lines.length === 0 ? (
            <p className="rs-empty">{t(ui.sets.empty)}</p>
          ) : (
            <>
              <ul className="rs-lines" aria-label={t(ui.sets.lines)}>
                {lines.map((l) => {
                  const d = dishes.get(l.id)!;
                  return (
                    <li key={l.id} className="rs-line">
                      <span className="rs-line-ph">{d.photo && <Photo name={d.photo} src={240} widths={[240]} sizes="56px" width={240} height={240} loading="lazy" />}</span>
                      <span className="rs-line-main">
                        <b>{t(d.name)}</b>
                        <small>{formatSum(d.price * l.qty, locale)}</small>
                      </span>
                      <span className="rs-stepper">
                        <button type="button" onClick={() => changeQty(l.id, -1)} aria-label={`${t(ui.sets.qtyLess)}: ${t(d.name)}`}>
                          <IconMinus />
                        </button>
                        <b aria-live="polite">{l.qty}</b>
                        <button type="button" onClick={() => changeQty(l.id, 1)} disabled={l.qty >= MAX_QTY} aria-label={`${t(ui.sets.qtyMore)}: ${t(d.name)}`}>
                          <IconPlus />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="rs-hint">{t(ui.sets.editHint)}</p>
              <dl className="rs-total">
                {sum.discount > 0 && (
                  <>
                    <div className="sub">
                      <dt>{t(ui.sets.subtotal)}</dt>
                      <dd>{formatSum(sum.subtotal, locale)}</dd>
                    </div>
                    <div className="off">
                      <dt>{fill(t(ui.sets.discount), { p: discount })}</dt>
                      <dd>−{formatSum(sum.discount, locale)}</dd>
                    </div>
                  </>
                )}
                <div className="all">
                  <dt>{t(ui.sets.total)}</dt>
                  <dd data-total={sum.total}>{formatSum(sum.total, locale)}</dd>
                </div>
              </dl>
              <BookButton className="rs-cta" seed={{ guests, wish: { kind: "set", refId: preset.id, lines, discount } }}>
                {t(ui.sets.cta)}
              </BookButton>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
