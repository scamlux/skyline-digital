"use client";

import { useState } from "react";
import { plural } from "../kit/plural";
import { pick, type Locale } from "../types";
import type { DoctorTag } from "./data";
import { NextSlot } from "./live";
import { planDraft } from "./plan-store";
import type { ScheduleData } from "./schedule";
import { clinicUi as ui } from "./ui";

export interface DoctorCard {
  id: string;
  name: string;
  role: string;
  years: number;
  photo: string;
  tags: DoctorTag[];
  /** Услуга, по которой считаем ближайшее окно врача. */
  slotService: string;
}

const IMG = "/templates/clinic/img";
const TAGS: DoctorTag[] = ["therapist", "ortho", "surgeon", "kids"];

/** Врачи: чипы специальностей фильтруют карточки; у каждой — ближайшее окно и «Записаться». */
export function DoctorList({ doctors, sched, locale }: { doctors: DoctorCard[]; sched: ScheduleData; locale: Locale }) {
  const [tag, setTag] = useState<DoctorTag | "all">("all");
  const shown = tag === "all" ? doctors : doctors.filter((d) => d.tags.includes(tag));
  return (
    <>
      <div className="cl-chips cl-filter" role="group" aria-label={pick(ui.doctors.filterLabel, locale)}>
        <button type="button" aria-pressed={tag === "all"} onClick={() => setTag("all")}>
          {pick(ui.doctors.all, locale)}
        </button>
        {TAGS.map((k) => (
          <button key={k} type="button" aria-pressed={tag === k} onClick={() => setTag(k)}>
            {pick(ui.tags[k], locale)}
          </button>
        ))}
      </div>
      <ul className="cl-docs cl-snap" aria-label={pick(ui.doctors.title, locale)}>
        {shown.map((d) => (
          <li key={d.id} className="cl-doc">
            {/* eslint-disable-next-line @next/next/no-img-element -- переносимый шаблон: без next/image */}
            <img src={`${IMG}/${d.photo}-480.webp`} srcSet={`${IMG}/${d.photo}-480.webp 480w, ${IMG}/${d.photo}-960.webp 960w`} sizes="(max-width: 860px) 62vw, 340px" width={480} height={600} alt={d.name} loading="lazy" decoding="async" />
            <div className="cl-doc-body">
              <h3>{d.name}</h3>
              <p className="cl-doc-role">{d.role}</p>
              <p className="cl-doc-years">
                <b>{d.years}</b> {plural(locale, d.years, ui.years[locale])}
              </p>
              <p className="cl-doc-next">
                <small>{pick(ui.doctors.next, locale)}</small>
                <NextSlot sched={sched} serviceId={d.slotService} doctorId={d.id} locale={locale} />
              </p>
              <button type="button" className="cl-btn ghost" onClick={() => planDraft.send({ serviceId: d.slotService, doctorId: d.id })}>
                {pick(ui.doctors.book, locale)}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
