"use client";

import { useState } from "react";
import { pick } from "../types";
import { useOverrides } from "./client-bits";
import { useSalon } from "./context";
import { bookingDraft, useBookingDraft } from "./draft-store";
import { Icon } from "./icons";
import { canCombine, packageBasket } from "./schedule";
import { PackageCard, ServiceTile, usePackages } from "./Services";
import { salonUi as ui } from "./ui";

/**
 * Шаг 1 записи: пакеты со скидкой, чипы групп и плитки услуг. Можно набрать несколько услуг;
 * плитка, которую не делает мастер текущего набора, подписана «другой мастер»: нажатие заменит
 * набор этой услугой (выбор не упирается в «нет мастера»).
 */
export function StepServices() {
  const { groups, services, packages, sched, locale } = useSalon();
  const ov = useOverrides();
  const draft = useBookingDraft();
  const shownPacks = usePackages();
  const ids = draft.serviceIds;
  const [group, setGroup] = useState(() => services.find((s) => ids.includes(s.id))?.group ?? groups[0]?.id ?? "");
  const visible = services.filter((s) => !ov.services[s.id]?.hidden && sched.masters.some((m) => m.serviceIds.includes(s.id)));
  const rows = visible.filter((s) => s.group === group);

  const packSelected = (serviceIds: string[]) => serviceIds.length === ids.length && serviceIds.every((id) => ids.includes(id));

  return (
    <div className="sl-step-body">
      {draft.switched && (
        <p className="sl-hint" role="status">
          {pick(ui.sheet.switched, locale)}
        </p>
      )}
      {shownPacks.length > 0 && (
        <section aria-labelledby="sl-sheet-packs">
          <h3 id="sl-sheet-packs" className="sl-sub">
            {pick(ui.sheet.packages, locale)}
          </h3>
          <ul className="sl-packs sl-snap">
            {packages
              .filter((p) => shownPacks.includes(p) && packageBasket(sched, ov, sched.packages.find((x) => x.id === p.id)!))
              .map((p) => (
                <PackageCard key={p.id} pkg={p} ov={ov} selected={packSelected(p.serviceIds)} onPick={() => bookingDraft.setServices(packSelected(p.serviceIds) ? [] : p.serviceIds)} />
              ))}
          </ul>
        </section>
      )}
      <div className="sl-chips sl-chips-scroll" role="tablist" aria-label={pick(ui.services.groupsLabel, locale)}>
        {groups.map((g) => {
          const count = visible.filter((s) => s.group === g.id && ids.includes(s.id)).length;
          return (
            <button key={g.id} type="button" role="tab" aria-selected={group === g.id} className="sl-chip" onClick={() => setGroup(g.id)}>
              <Icon id={g.icon} size={20} />
              {g.name}
              {count > 0 && <em className="sl-count">{count}</em>}
            </button>
          );
        })}
      </div>
      <ul className="sl-tiles" role="tabpanel">
        {rows.map((s) => {
          const selected = ids.includes(s.id);
          const dim = !selected && ids.length > 0 && !canCombine(sched, ids, s.id);
          return <ServiceTile key={s.id} svc={s} ov={ov} selected={selected} dim={dim} dimLabel={pick(ui.services.otherMaster, locale)} onPick={() => bookingDraft.toggleService(sched, s.id)} />;
        })}
      </ul>
    </div>
  );
}
