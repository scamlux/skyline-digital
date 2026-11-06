"use client";

import { useEffect, useRef, useState } from "react";
import { formatSum, pick, type L } from "../types";
import { useNextWindowFor, useOverrides } from "./client-bits";
import { useSalon } from "./context";
import { bookingDraft, goToBooking } from "./draft-store";
import { fill, formatMinutes } from "./format";
import { recommend, type Care, type QuizAnswers, type Vibe, type Who } from "./pick-look";
import { basketOf } from "./schedule";
import { demo } from "./store";
import { salonUi as ui } from "./ui";

const IMG = "/templates/salon/img";
type Step = 0 | 1 | 2 | 3;

interface Option<V extends string> {
  value: V;
  label: L;
  hint?: L;
}

const WHO: Option<Who>[] = [
  { value: "men", label: ui.quiz.men },
  { value: "women", label: ui.quiz.women },
];
const VIBE: Option<Vibe>[] = [
  { value: "short", label: ui.quiz.short, hint: ui.quiz.shortHint },
  { value: "bold", label: ui.quiz.bold, hint: ui.quiz.boldHint },
  { value: "classic", label: ui.quiz.classic, hint: ui.quiz.classicHint },
];

/**
 * «Подбор образа»: три вопроса → образ из лукбука, услуги, цена, длительность и мастер, который
 * делает такой образ лучше всего. Результат считает та же чистая функция, что и тесты, а цена
 * и скрытие услуг берутся из правок владельца. Кнопка «Записаться на этот образ» заполняет форму.
 */
export function Quiz() {
  const { locale, looks, services, masters, sched } = useSalon();
  const ov = useOverrides();
  const [step, setStep] = useState<Step>(0);
  const [who, setWho] = useState<Who>("men");
  const [vibe, setVibe] = useState<Vibe>("short");
  const [care, setCare] = useState<Care>("no");
  const headRef = useRef<HTMLHeadingElement>(null);

  const [moved, setMoved] = useState(false);
  const go = (next: Step) => {
    setMoved(true);
    setStep(next);
  };
  // Кнопка, на которой стоял фокус, исчезает при смене шага — переносим фокус на заголовок шага.
  useEffect(() => {
    if (moved) headRef.current?.focus();
  }, [step, moved]);
  const answers: QuizAnswers = { who, vibe, care };
  const t = (l: L) => pick(l, locale);
  const careOptions: Option<Care>[] =
    who === "men"
      ? [
          { value: "yes", label: ui.quiz.beardYes },
          { value: "no", label: ui.quiz.beardNo },
        ]
      : [
          { value: "yes", label: ui.quiz.careYes },
          { value: "no", label: ui.quiz.careNo },
        ];

  const rec = step === 3 ? recommend(sched, ov, answers) : null;
  const look = rec ? looks.find((l) => l.id === rec.lookId) : null;
  const basket = rec ? basketOf(sched, ov, rec.serviceIds) : null;
  const master = rec?.masterId ? masters.find((m) => m.id === rec.masterId) : null;

  function pickOption<V extends string>(set: (v: V) => void, v: V, next: Step) {
    set(v);
    go(next);
    if (next === 3) demo.track("quiz");
  }

  const question = step === 0 ? ui.quiz.q1 : step === 1 ? ui.quiz.q2 : who === "men" ? ui.quiz.q3men : ui.quiz.q3women;

  return (
    <div className="sl-quiz" data-pointer>
      {step < 3 && (
        <>
          <div className="sl-quiz-top">
            <p className="sl-quiz-step">{fill(t(ui.quiz.step), { n: step + 1 })}</p>
            <div className="sl-quiz-dots" role="img" aria-label={t(ui.quiz.progress)}>
              {[0, 1, 2].map((i) => (
                <i key={i} data-on={i <= step || undefined} />
              ))}
            </div>
          </div>
          <h3 ref={headRef} tabIndex={-1} className="sl-quiz-q">
            {t(question)}
          </h3>
          <div className="sl-quiz-opts" role="group" aria-label={t(question)}>
            {step === 0 && WHO.map((o) => <OptionButton key={o.value} label={t(o.label)} onPick={() => pickOption(setWho, o.value, 1)} />)}
            {step === 1 && VIBE.map((o) => <OptionButton key={o.value} label={t(o.label)} hint={o.hint && t(o.hint)} onPick={() => pickOption(setVibe, o.value, 2)} />)}
            {step === 2 && careOptions.map((o) => <OptionButton key={o.value} label={t(o.label)} onPick={() => pickOption(setCare, o.value, 3)} />)}
          </div>
          {step > 0 && (
            <button type="button" className="sl-link" onClick={() => go((step - 1) as Step)}>
              ← {t(ui.quiz.back)}
            </button>
          )}
        </>
      )}
      {step === 3 && rec && look && basket && (
        <div className="sl-quiz-result">
          {/* eslint-disable-next-line @next/next/no-img-element -- шаблон переносимый: без next/image */}
          <img src={`${IMG}/${look.photo}-480.webp`} srcSet={`${IMG}/${look.photo}-480.webp 480w, ${IMG}/${look.photo}-960.webp 960w`} sizes="(max-width: 860px) 70vw, 300px" width={960} height={1200} alt={look.alt} loading="lazy" decoding="async" />
          <div className="sl-quiz-body">
            <p className="sl-quiz-step">{t(ui.quiz.resultTitle)}</p>
            <h3 ref={headRef} tabIndex={-1} className="sl-quiz-q">
              {look.title}
            </h3>
            {basket.ids.length === 0 ? (
              <p className="sl-note">{t(ui.quiz.empty)}</p>
            ) : (
              <>
                <ul className="sl-quiz-svc" aria-label={t(ui.quiz.services)}>
                  {basket.ids.map((id) => (
                    <li key={id}>{services.find((s) => s.id === id)?.name}</li>
                  ))}
                </ul>
                <p className="sl-quiz-sum">
                  <b>{formatSum(basket.price, locale)}</b> · {formatMinutes(basket.minutes, locale)}
                </p>
                {master && <QuizMaster name={master.name} masterId={master.id} serviceIds={basket.ids} />}
              </>
            )}
            <div className="sl-quiz-act">
              <button
                type="button"
                className="sl-btn"
                disabled={basket.ids.length === 0}
                onClick={() => {
                  bookingDraft.send({ serviceIds: basket.ids, masterId: rec.masterId, lookId: look.id });
                  goToBooking();
                }}
              >
                {t(ui.quiz.cta)}
              </button>
              <button type="button" className="sl-link" onClick={() => go(0)}>
                {t(ui.quiz.again)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionButton({ label, hint, onPick }: { label: string; hint?: string; onPick: () => void }) {
  return (
    <button type="button" className="sl-quiz-opt" onClick={onPick}>
      <b>{label}</b>
      {hint && <small>{hint}</small>}
    </button>
  );
}

/** Мастер и его ближайшее окно под этот набор услуг. */
function QuizMaster({ name, masterId, serviceIds }: { name: string; masterId: string; serviceIds: string[] }) {
  const { locale } = useSalon();
  const win = useNextWindowFor(masterId, serviceIds);
  return (
    <p className="sl-quiz-master">
      {pick(ui.quiz.master, locale)}: <b>{name}</b>
      {win && (
        <span>
          {" "}
          · {pick(ui.quiz.next, locale)}: <b>{win.label}</b>
        </span>
      )}
    </p>
  );
}
