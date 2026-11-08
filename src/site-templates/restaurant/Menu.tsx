"use client";

import { useMemo, useState } from "react";
import { formatSum, pick, type Locale } from "../types";
import { BookButton } from "./client-bits";
import type { MenuCategory, Tag } from "./data";
import { IconFlame, IconHit, IconLeaf, IconTableBook } from "./icons";
import { LatePhoto as Photo } from "./late-photo";
import { dishIndex } from "./sets";
import { useDemoState } from "./store";
import { restaurantUi as ui } from "./ui";

const TAGS: Tag[] = ["hit", "spicy", "veg"];
const TAG_ICON = { hit: IconHit, spicy: IconFlame, veg: IconLeaf } satisfies Record<Tag, () => React.JSX.Element>;

/**
 * Меню как витрина: фото в первую очередь, фильтры-пилюли (раздел и «хит / острое / без мяса»),
 * на каждой карточке — «прийти на это». Цены, стоп-лист и скрытие берутся из кабинета владельца.
 */
export function MenuSection({ menu, locale }: { menu: MenuCategory[]; locale: Locale }) {
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);
  const overrides = useDemoState().items;
  const dishes = useMemo(() => dishIndex(menu, overrides), [menu, overrides]);
  const [cat, setCat] = useState<string>("all");
  const [tag, setTag] = useState<Tag | null>(null);

  const visible = menu
    .filter((c) => cat === "all" || c.id === cat)
    .flatMap((c) => c.items)
    .map((it) => dishes.get(it.id)!)
    .filter((d) => !d.hidden && (!tag || d.tags?.includes(tag)));

  return (
    <section className="rs-sec rs-menu" id="menu" aria-labelledby="menu-title" data-reveal>
      <div className="rs-sec-head">
        <h2 id="menu-title">{t(ui.menu.title)}</h2>
        <p>{t(ui.menu.lead)}</p>
      </div>

      <div className="rs-filters" role="group" aria-label={t(ui.menu.filtersLabel)}>
        <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          {t(ui.menu.all)}
        </button>
        {menu.map((c) => (
          <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            {t(c.title)}
          </button>
        ))}
        <span className="rs-filter-gap" aria-hidden="true" />
        {TAGS.map((k) => {
          const Icon = TAG_ICON[k];
          return (
            <button key={k} type="button" className="tag" data-tag={k} aria-pressed={tag === k} onClick={() => setTag(tag === k ? null : k)}>
              <Icon />
              {t(ui.menu.tags[k])}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rs-empty">{t(ui.menu.empty)}</p>
      ) : (
        <ul className="rs-grid">
          {visible.map((d) => (
            <li key={d.id} className="rs-dish" data-out={!d.orderable || undefined}>
              <div className="rs-dish-ph">
                {d.photo && <Photo name={d.photo} src={480} sizes="(max-width: 640px) 46vw, (max-width: 1000px) 30vw, 22vw" width={480} height={360} loading="lazy" />}
                {(d.tags?.length ?? 0) > 0 && (
                  <span className="rs-dish-tags">
                    {d.tags!.map((k) => {
                      const Icon = TAG_ICON[k];
                      return (
                        <span key={k} data-tag={k}>
                          <Icon />
                          {t(ui.menu.tags[k])}
                        </span>
                      );
                    })}
                  </span>
                )}
                {!d.orderable && <span className="rs-dish-out">{t(ui.menu.unavailable)}</span>}
                {d.orderable && (
                  <BookButton
                    className="rs-dish-book"
                    aria-label={`${t(ui.menu.wish)}: ${t(d.name)}`}
                    seed={{ wish: { kind: "dish", refId: d.id, lines: [{ id: d.id, qty: 1 }], discount: 0 } }}
                  >
                    <IconTableBook />
                  </BookButton>
                )}
              </div>
              <div className="rs-dish-body">
                <h3>{t(d.name)}</h3>
                <p className="rs-dish-price">{formatSum(d.price, locale)}</p>
                {d.desc && <p className="rs-dish-desc">{t(d.desc)}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
