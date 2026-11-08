"use client";

import { useEffect, useRef, useState } from "react";
import { formatSum, pick } from "../types";
import { useNextWindowFor, useOverrides } from "./client-bits";
import { useSalon, useSalonStore } from "./context";
import { bookingDraft } from "./draft-store";
import { fill, formatMinutes } from "./format";
import { Icon } from "./icons";
import { recommend } from "./pick-look";
import { basketOf } from "./schedule";
import { salonUi as ui } from "./ui";

const IMG = "/templates/salon/img";

/**
 * «Подбор образа»: два вопроса плитками с фото → образ из лукбука, услуги, цена и мастер.
 * Два касания до результата, третье — «Записаться». Результат считает та же чистая функция, что
 * и тесты, а цена и скрытие услуг берутся из правок владельца.
 */
export function Quiz() {
  const { locale, looks, services, masters, sched, quiz } = useSalon();
  const { demo } = useSalonStore();
  const ov = useOverrides();
  const [answers, setAnswers] = useState<string[]>([]);
  const headRef = useRef<HTMLHeadingElement>(null);
  const [moved, setMoved] = useState(false);
  const step = answers.length;

  // Кнопка, на которой стоял фокус, исчезает при смене шага: переносим фокус на заголовок шага.
  useEffect(() => {
    if (moved) headRef.current?.focus();
  }, [step, moved]);

  const done = step >= 2;
  const rec = done ? recommend(sched, ov, [answers[0], answers[1]]) : null;
  const look = rec ? looks.find((l) => l.id === rec.lookId) : null;
  const basket = rec ? basketOf(sched, ov, rec.serviceIds) : null;
  const master = rec?.masterId ? masters.find((m) => m.id === rec.masterId) : null;

  function pickOption(id: string) {
    const next = [...answers, id];
    setMoved(true);
    setAnswers(next);
    if (next.length === 2) demo.track("quiz");
  }

  const question = quiz.questions[Math.min(step, 1)];

  return (
    <div className="sl-quiz">
      {!done && (
        <>
          <div className="sl-quiz-top">
            <p className="sl-quiz-step">{fill(pick(ui.quiz.step, locale), { n: step + 1 })}</p>
            <div className="sl-dots" role="img" aria-label={pick(ui.quiz.progress, locale)}>
              {[0, 1].map((i) => (
                <i key={i} data-on={i <= step || undefined} />
              ))}
            </div>
          </div>
          <h3 ref={headRef} tabIndex={-1} className="sl-quiz-q">
            {question.title}
          </h3>
          <ul className="sl-quiz-opts" data-cols={question.options.length}>
            {question.options.map((o) => {
              const photo = o.lookId ? looks.find((l) => l.id === o.lookId)?.photo : null;
              return (
                <li key={o.id}>
                  <button type="button" className="sl-quiz-opt" onClick={() => pickOption(o.id)}>
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- шаблон переносимый: без next/image
                      <img src={`${IMG}/${photo}-240.webp`} width={240} height={300} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className="sl-quiz-ic">{o.icon && <Icon id={o.icon} size={34} />}</span>
                    )}
                    <b>{o.label}</b>
                  </button>
                </li>
              );
            })}
          </ul>
          {step > 0 && (
            <button type="button" className="sl-link" onClick={() => setAnswers(answers.slice(0, -1))}>
              ← {pick(ui.quiz.back, locale)}
            </button>
          )}
        </>
      )}

      {done && rec && look && basket && (
        <div className="sl-quiz-result">
          {/* eslint-disable-next-line @next/next/no-img-element -- шаблон переносимый: без next/image */}
          <img src={`${IMG}/${look.photo}-480.webp`} srcSet={`${IMG}/${look.photo}-480.webp 480w, ${IMG}/${look.photo}-960.webp 960w`} sizes="(max-width: 860px) 60vw, 300px" width={960} height={1200} alt={look.alt} loading="lazy" decoding="async" />
          <div className="sl-quiz-body">
            <p className="sl-quiz-step">{pick(ui.quiz.resultTitle, locale)}</p>
            <h3 ref={headRef} tabIndex={-1} className="sl-quiz-q">
              {look.title}
            </h3>
            {basket.ids.length === 0 ? (
              <p className="sl-note">{pick(ui.quiz.empty, locale)}</p>
            ) : (
              <>
                <ul className="sl-tags">
                  {basket.ids.map((id) => (
                    <li key={id}>{services.find((s) => s.id === id)?.name}</li>
                  ))}
                </ul>
                <p className="sl-quiz-sum">
                  {basket.saved > 0 && <s>{formatSum(basket.full, locale)}</s>} <b>{formatSum(basket.price, locale)}</b>
                  <span>{formatMinutes(basket.minutes, locale)}</span>
                </p>
                {master && <QuizMaster name={master.name} masterId={master.id} serviceIds={basket.ids} />}
              </>
            )}
            <div className="sl-quiz-act">
              <button
                type="button"
                className="sl-btn"
                disabled={basket.ids.length === 0}
                onClick={() => bookingDraft.open({ serviceIds: basket.ids, masterId: rec.masterId, lookId: look.id, step: 2 })}
              >
                {pick(ui.book, locale)}
              </button>
              <button type="button" className="sl-link" onClick={() => setAnswers([])}>
                {pick(ui.quiz.again, locale)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Мастер и его ближайшее окно под этот набор услуг. */
function QuizMaster({ name, masterId, serviceIds }: { name: string; masterId: string; serviceIds: string[] }) {
  const { locale } = useSalon();
  const win = useNextWindowFor(masterId, serviceIds);
  return (
    <p className="sl-quiz-master">
      <Icon id="user" size={16} /> <b>{name}</b>
      {win && (
        <span>
          <Icon id="clock" size={16} /> {win.label}
        </span>
      )}
      <span className="sr-only">{pick(ui.quiz.master, locale)}</span>
    </p>
  );
}
