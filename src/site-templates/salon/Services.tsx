"use client";

import { useState } from "react";
import { formatSum, pick } from "../types";
import { useOverrides } from "./client-bits";
import { useSalon } from "./context";
import type { CatalogPackage, CatalogService } from "./catalog";
import { bookingDraft } from "./draft-store";
import { fill, formatMinutes } from "./format";
import { Icon } from "./icons";
import { effectiveService, packageBasket, packagePct, type SalonOverrides } from "./schedule";
import { salonUi as ui } from "./ui";

/** Плитка услуги: иконка, название, время и цена. Используется и на странице, и в шторке записи. */
export function ServiceTile({ svc, ov, selected, dim, dimLabel, onPick }: { svc: CatalogService; ov: SalonOverrides; selected?: boolean; dim?: boolean; dimLabel?: string; onPick: () => void }) {
  const { locale } = useSalon();
  const eff = effectiveService({ id: svc.id, minutes: svc.minutes, price: svc.price }, ov);
  return (
    <li>
      <button type="button" className="sl-tile" aria-pressed={selected === undefined ? undefined : selected} data-dim={dim || undefined} onClick={onPick}>
        <span className="sl-tile-ic">
          <Icon id={selected ? "check" : svc.icon} size={26} />
        </span>
        <span className="sl-tile-name">{svc.name}</span>
        <span className="sl-tile-meta">
          <b>{eff.price === 0 ? "0" : formatSum(eff.price, locale)}</b>
          <span>{formatMinutes(eff.minutes, locale)}</span>
        </span>
        {svc.note && !dim && <span className="sl-tile-note">{svc.note}</span>}
        {dim && dimLabel && <span className="sl-tile-note">{dimLabel}</span>}
      </button>
    </li>
  );
}

/** Карточка пакета: набор услуг со скидкой, считает та же функция, что и запись. */
export function PackageCard({ pkg, ov, selected, onPick }: { pkg: CatalogPackage; ov: SalonOverrides; selected?: boolean; onPick: () => void }) {
  const { locale, sched, services } = useSalon();
  const core = sched.packages.find((p) => p.id === pkg.id);
  const b = core ? packageBasket(sched, ov, core) : null;
  if (!core || !b) return null;
  const pct = packagePct(core, ov);
  const names = pkg.serviceIds.map((id) => services.find((s) => s.id === id)?.name ?? id).join(" + ");
  return (
    <li>
      <button type="button" className="sl-pack" aria-pressed={selected === undefined ? undefined : selected} onClick={onPick}>
        <span className="sl-pack-top">
          <Icon id={pkg.icon} size={24} />
          {pct > 0 && <em>{fill(pick(ui.services.save, locale), { pct })}</em>}
        </span>
        <b className="sl-pack-name">{pkg.name}</b>
        <span className="sl-pack-svc">{names}</span>
        <span className="sl-pack-price">
          {b.saved > 0 && <s>{formatSum(b.full, locale)}</s>}
          <b>{formatSum(b.price, locale)}</b>
          <small>{formatMinutes(b.minutes, locale)}</small>
        </span>
      </button>
    </li>
  );
}

/** Пакеты, видимые для гостя (скрытые владельцем не показываются). */
export function usePackages(): CatalogPackage[] {
  const { packages, sched } = useSalon();
  const ov = useOverrides();
  return packages.filter((p) => {
    const core = sched.packages.find((x) => x.id === p.id);
    return core ? packageBasket(sched, ov, core) !== null : false;
  });
}

/**
 * Услуги на странице: группы чипами, плитки с ценой и временем, пакеты. Нажатие на плитку или
 * пакет сразу открывает запись с этим выбором.
 */
export function ServicesPicker() {
  const { groups, services, packages, sched, locale } = useSalon();
  const ov = useOverrides();
  const [group, setGroup] = useState(groups[0]?.id ?? "");
  const visible = services.filter((s) => !ov.services[s.id]?.hidden && sched.masters.some((m) => m.serviceIds.includes(s.id)));
  const rows = visible.filter((s) => s.group === group);
  const shownPacks = usePackages();

  return (
    <div className="sl-services">
      {shownPacks.length > 0 && (
        <section aria-label={pick(ui.services.packages, locale)}>
          <ul className="sl-packs sl-snap">
            {packages.filter((p) => shownPacks.includes(p)).map((p) => (
              <PackageCard
                key={p.id}
                pkg={p}
                ov={ov}
                onPick={() => bookingDraft.open({ serviceIds: p.serviceIds, step: 2 })}
              />
            ))}
          </ul>
        </section>
      )}
      <div className="sl-chips" role="tablist" aria-label={pick(ui.services.groupsLabel, locale)}>
        {groups.map((g) => (
          <button key={g.id} type="button" role="tab" id={`sl-g-${g.id}`} aria-selected={group === g.id} aria-controls="sl-svc-panel" className="sl-chip" onClick={() => setGroup(g.id)}>
            <Icon id={g.icon} size={20} />
            {g.name}
          </button>
        ))}
      </div>
      <ul className="sl-tiles" role="tabpanel" id="sl-svc-panel" aria-labelledby={`sl-g-${group}`}>
        {rows.length === 0 && <li className="sl-note">{pick(ui.services.empty, locale)}</li>}
        {rows.map((s) => (
          <ServiceTile key={s.id} svc={s} ov={ov} onPick={() => bookingDraft.open({ serviceIds: [s.id], step: 2 })} />
        ))}
      </ul>
    </div>
  );
}
