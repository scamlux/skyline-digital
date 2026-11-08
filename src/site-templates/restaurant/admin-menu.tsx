"use client";

import { useState } from "react";
import { formatSum, pick, type L, type Locale } from "../types";
import { adminUi as ui } from "./admin-ui";
import type { MenuCategory, SetPreset } from "./data";
import { fill } from "./format";
import { LatePhoto as Photo } from "./late-photo";
import { MAX_DISCOUNT, dishIndex, resolveSet } from "./sets";
import { demo, useDemoState } from "./store";

const SAVED_FLASH_MS = 1200;

/** Число: клик по значению — поле ввода; Enter или потеря фокуса — сохраняет. */
function PriceEdit({ value, locale, label, saved, onCommit }: { value: number; locale: Locale; label: string; saved: string; onCommit: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState(false);
  const commit = (raw: string) => {
    const n = Number(raw.replace(/\D/g, ""));
    if (n > 0 && n !== value) {
      onCommit(n);
      setFlash(true);
      window.setTimeout(() => setFlash(false), SAVED_FLASH_MS);
    }
    setEditing(false);
  };
  if (!editing) {
    return (
      <button type="button" className="adm-price" onClick={() => setEditing(true)} aria-label={`${label}: ${formatSum(value, locale)}`}>
        {formatSum(value, locale)}
        {flash && <small> {saved}</small>}
      </button>
    );
  }
  return (
    <input
      className="adm-price-input"
      type="text"
      inputMode="numeric"
      defaultValue={value}
      aria-label={label}
      autoFocus
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

/** Скидка набора в процентах: целое 0…MAX_DISCOUNT, сохраняется при потере фокуса и по Enter. */
function PercentEdit({ value, label, onCommit }: { value: number; label: string; onCommit: (n: number) => void }) {
  return (
    <label className="adm-pct">
      <span>{label}</span>
      <input
        key={value}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_DISCOUNT}
        defaultValue={value}
        onBlur={(e) => onCommit(Math.min(MAX_DISCOUNT, Math.max(0, Math.round(Number(e.target.value) || 0))))}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

export function MenuTab({ menu, sets, locale }: { menu: MenuCategory[]; sets: SetPreset[]; locale: Locale }) {
  const t = (l: L) => pick(l, locale);
  const state = useDemoState();
  const dishes = dishIndex(menu, state.items);
  return (
    <section aria-label={t(ui.tabs.menu)}>
      <p className="adm-hint">{t(ui.menu.hint)}</p>
      {menu.map((c) => (
        <div key={c.id} className="adm-cat">
          <h2 className="adm-h2">{t(c.title)}</h2>
          <ul className="adm-items">
            {c.items.map((it) => {
              const d = dishes.get(it.id)!;
              const avail = state.items[it.id]?.available ?? it.available !== false;
              return (
                <li key={it.id} className="adm-item" data-hidden={d.hidden || undefined} data-out={!avail || undefined} data-id={it.id}>
                  <span className="adm-thumb">{it.photo && <Photo name={it.photo} src={240} widths={[240]} sizes="48px" width={240} height={240} loading="lazy" />}</span>
                  <span className="adm-item-name">
                    {t(it.name)}
                    {d.hidden && <small>{t(ui.menu.hidden)}</small>}
                  </span>
                  <PriceEdit value={d.price} locale={locale} label={`${t(it.name)} — ${t(ui.menu.price)}`} saved={t(ui.menu.saved)} onCommit={(n) => demo.setItem(it.id, { price: n })} />
                  <button type="button" className="adm-toggle" role="switch" aria-checked={avail} aria-label={`${t(it.name)}: ${t(avail ? ui.menu.inStock : ui.menu.out)}`} onClick={() => demo.setItem(it.id, { available: !avail })}>
                    <i aria-hidden="true" />
                    {avail ? t(ui.menu.inStock) : t(ui.menu.out)}
                  </button>
                  <button type="button" className="adm-link" onClick={() => demo.setItem(it.id, { hidden: !d.hidden })}>
                    {d.hidden ? t(ui.menu.show) : t(ui.menu.hide)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="adm-cat" id="adm-sets">
        <h2 className="adm-h2">{t(ui.sets.title)}</h2>
        <p className="adm-hint">{t(ui.sets.hint)}</p>
        <div className="adm-sets">
          {sets.map((s) => {
            const ov = state.sets[s.id];
            const r = resolveSet(s, ov);
            const off = new Set(ov?.off ?? []);
            return (
              <article key={s.id} className="adm-set" data-set={s.id} data-off={!r.on || undefined}>
                <header>
                  <span className="adm-thumb big">
                    <Photo name={s.photo} src={240} widths={[240]} sizes="64px" width={240} height={240} loading="lazy" />
                  </span>
                  <span className="adm-item-name">
                    {t(s.name)}
                    <small className="muted">{t(s.blurb)}</small>
                  </span>
                  <button type="button" className="adm-toggle" role="switch" aria-checked={r.on} aria-label={`${t(s.name)}: ${t(ui.sets.on)}`} onClick={() => demo.setSet(s.id, { on: !r.on })}>
                    <i aria-hidden="true" />
                    {t(ui.sets.on)}
                  </button>
                </header>
                <PercentEdit value={r.discount} label={t(ui.sets.discount)} onCommit={(n) => demo.setSet(s.id, { discount: n })} />
                <h3 className="adm-h3">{t(ui.sets.contents)}</h3>
                <ul className="adm-set-items">
                  {s.items.map((it) => {
                    const d = dishes.get(it.id);
                    if (!d) return null;
                    const included = !off.has(it.id);
                    return (
                      <li key={it.id} data-out={!d.orderable || undefined}>
                        <label>
                          <input
                            type="checkbox"
                            checked={included}
                            onChange={() => demo.setSet(s.id, { off: included ? [...off, it.id] : [...off].filter((x) => x !== it.id) })}
                          />
                          <span>{t(d.name)}</span>
                          <small>{it.per === 1 ? t(ui.sets.perOne) : fill(t(ui.sets.per), { n: it.per })}</small>
                          {!d.orderable && <em>{t(ui.sets.outNow)}</em>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
