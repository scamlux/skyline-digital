"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { computePricing } from "@/lib/pricing/engine";
import {
  addonKeys,
  featuresByType,
  features as featureDefs,
  addons as addonDefs,
} from "@/lib/pricing/rules";
import type { PricingResult, ProjectType, Urgency } from "@/lib/pricing/types";
import type { Proposal } from "@/lib/ai/schema";
import { cn, formatUsd } from "@/lib/utils";
import { getLeadContext } from "@/lib/leadContext";
import { SunProgress } from "./SunProgress";

const TYPES: ProjectType[] = [
  "website",
  "webApp",
  "mobileApp",
  "ai",
  "automation",
  "uiux",
  "other",
];

const STEPS = ["type", "features", "addons", "info", "estimate"] as const;

interface InfoState {
  projectName: string;
  description: string;
  deadline: string;
  budget: string;
  contactName: string;
  company: string;
  email: string;
  phone: string;
  messenger: string;
}

const EMPTY_INFO: InfoState = {
  projectName: "",
  description: "",
  deadline: "",
  budget: "",
  contactName: "",
  company: "",
  email: "",
  phone: "",
  messenger: "",
};

interface EstimateResponse {
  token: string;
  pricing: PricingResult;
  proposal: Proposal;
  leadNumber?: string;
}

const inputCls =
  "w-full rounded-lg border border-line-night bg-night-deep px-4 py-3 text-sm text-day outline-none transition-colors placeholder:text-mist/60 focus:border-apricot";

export function Wizard() {
  const t = useTranslations("calc");
  const [step, setStep] = useState(0);
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addons, setAddons] = useState<Set<string>>(new Set());
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [info, setInfo] = useState<InfoState>(EMPTY_INFO);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResponse | null>(null);

  const stepLabels = STEPS.map((s) => t(`steps.${s}`));

  // Live preview: the deterministic engine runs client-side on every change.
  const preview = useMemo(() => {
    if (!projectType) return null;
    return computePricing({
      projectType,
      features: [...selected],
      addons: [...addons],
      urgency,
    });
  }, [projectType, selected, addons, urgency]);

  function toggle(set: Set<string>, key: string, apply: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  }

  function selectType(type: ProjectType) {
    setProjectType(type);
    // Reset features not valid for the new type.
    setSelected(new Set());
  }

  function next() {
    setErrorMsg(null);
    if (step === 0 && !projectType) {
      setErrorMsg(t("errors.selectType"));
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setErrorMsg(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  const infoValid =
    info.projectName.trim() !== "" &&
    info.contactName.trim() !== "" &&
    /.+@.+\..+/.test(info.email);

  async function submit() {
    if (!projectType) return;
    if (!infoValid) {
      setErrorMsg(t("errors.required"));
      return;
    }
    setErrorMsg(null);
    setStatus("sending");
    setStep(4);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configuration: {
            projectType,
            features: [...selected],
            addons: [...addons],
            urgency,
          },
          info: { ...info, hp: "" },
          context: getLeadContext(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: EstimateResponse = await res.json();
      setResult(data);
      setStatus("idle");
    } catch {
      setStatus("error");
      setStep(3);
      setErrorMsg(t("errors.generic"));
    }
  }

  const availableFeatures = projectType ? featuresByType[projectType] : [];

  return (
    <div className="mx-auto max-w-3xl">
      <SunProgress step={step} total={STEPS.length} labels={stepLabels} />

      <p className="mt-6 font-mono text-xs uppercase tracking-wide text-mist">
        {t("stepLabel")} {step + 1} {t("of")} {STEPS.length} — {stepLabels[step]}
      </p>

      <div className="mt-6 min-h-[320px]">
        {/* ——— Step 1: project type ——— */}
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => selectType(type)}
                aria-pressed={projectType === type}
                className={cn(
                  "rounded-xl border p-5 text-left transition-colors",
                  projectType === type
                    ? "border-apricot bg-night-deep"
                    : "border-line-night hover:border-mist",
                )}
              >
                <span className="block font-medium text-day">
                  {t(`types.${type}.title`)}
                </span>
                <span className="mt-1 block text-sm text-mist">
                  {t(`types.${type}.desc`)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ——— Step 2: features (depend on type) ——— */}
        {step === 1 &&
          (availableFeatures.length === 0 ? (
            <p className="text-mist">{t("noFeatures")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availableFeatures.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(selected, key, setSelected)}
                  aria-pressed={selected.has(key)}
                  className={cn(
                    "flex items-baseline justify-between gap-3 rounded-xl border px-5 py-4 text-left transition-colors",
                    selected.has(key)
                      ? "border-apricot bg-night-deep"
                      : "border-line-night hover:border-mist",
                  )}
                >
                  <span className="text-sm text-day">{t(`features.${key}`)}</span>
                  <span className="shrink-0 font-mono text-xs text-mist">
                    +{formatUsd(featureDefs[key]?.price ?? 0)}
                  </span>
                </button>
              ))}
            </div>
          ))}

        {/* ——— Step 3: addons + urgency ——— */}
        {step === 2 && (
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {addonKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(addons, key, setAddons)}
                  aria-pressed={addons.has(key)}
                  className={cn(
                    "flex items-baseline justify-between gap-3 rounded-xl border px-5 py-4 text-left transition-colors",
                    addons.has(key)
                      ? "border-apricot bg-night-deep"
                      : "border-line-night hover:border-mist",
                  )}
                >
                  <span className="text-sm text-day">{t(`addons.${key}`)}</span>
                  <span className="shrink-0 font-mono text-xs text-mist">
                    +{formatUsd(addonDefs[key]?.price ?? 0)}
                  </span>
                </button>
              ))}
            </div>
            <fieldset className="mt-8">
              <legend className="font-mono text-xs uppercase tracking-wide text-mist">
                {t("urgency.label")}
              </legend>
              <div className="mt-3 flex gap-3">
                {(["normal", "urgent"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    aria-pressed={urgency === u}
                    className={cn(
                      "rounded-full border px-5 py-2.5 text-sm transition-colors",
                      urgency === u
                        ? "border-apricot text-day"
                        : "border-line-night text-mist hover:border-mist",
                    )}
                  >
                    {t(`urgency.${u}`)}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {/* ——— Step 4: project info ——— */}
        {step === 3 && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm text-day">{t("info.projectName")} *</span>
                <input
                  value={info.projectName}
                  onChange={(e) => setInfo({ ...info, projectName: e.target.value })}
                  placeholder={t("info.projectNamePlaceholder")}
                  maxLength={120}
                  className={inputCls}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm text-day">{t("info.deadline")}</span>
                <input
                  value={info.deadline}
                  onChange={(e) => setInfo({ ...info, deadline: e.target.value })}
                  placeholder={t("info.deadlinePlaceholder")}
                  maxLength={120}
                  className={inputCls}
                />
              </label>
            </div>
            <label className="grid gap-1.5">
              <span className="text-sm text-day">{t("info.description")}</span>
              <textarea
                value={info.description}
                onChange={(e) => setInfo({ ...info, description: e.target.value })}
                placeholder={t("info.descriptionPlaceholder")}
                rows={4}
                maxLength={2000}
                className={cn(inputCls, "resize-y")}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm text-day">{t("info.budget")}</span>
                <input
                  value={info.budget}
                  onChange={(e) => setInfo({ ...info, budget: e.target.value })}
                  placeholder={t("info.budgetPlaceholder")}
                  maxLength={120}
                  className={inputCls}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm text-day">{t("info.contactName")} *</span>
                <input
                  value={info.contactName}
                  onChange={(e) => setInfo({ ...info, contactName: e.target.value })}
                  maxLength={120}
                  className={inputCls}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm text-day">{t("info.email")} *</span>
                <input
                  type="email"
                  value={info.email}
                  onChange={(e) => setInfo({ ...info, email: e.target.value })}
                  maxLength={200}
                  className={inputCls}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm text-day">{t("info.phone")}</span>
                <input
                  type="tel"
                  value={info.phone}
                  onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                  placeholder="+998 90 123-45-67"
                  maxLength={60}
                  className={inputCls}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-sm text-day">{t("info.company")}</span>
                <input
                  value={info.company}
                  onChange={(e) => setInfo({ ...info, company: e.target.value })}
                  maxLength={120}
                  className={inputCls}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm text-day">{t("info.messenger")}</span>
                <input
                  value={info.messenger}
                  onChange={(e) => setInfo({ ...info, messenger: e.target.value })}
                  placeholder={t("info.messengerPlaceholder")}
                  maxLength={200}
                  className={inputCls}
                />
              </label>
            </div>
          </div>
        )}

        {/* ——— Step 5: estimate ——— */}
        {step === 4 &&
          (result ? (
            <ResultView result={result} />
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <div className="sun-disc h-12 w-12 animate-pulse" aria-hidden />
              <p className="mt-6 text-day">{t("calculating")}</p>
              <p className="mt-2 font-mono text-xs text-mist">{t("calculatingHint")}</p>
            </div>
          ))}
      </div>

      {errorMsg && (
        <p className="mt-4 text-sm text-afterglow" role="alert">
          {errorMsg}
        </p>
      )}

      {/* ——— Footer: nav + live price ——— */}
      {step < 4 && (
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-line-night pt-6">
          <div>
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-full border border-line-night px-6 py-3 text-sm text-mist transition-colors hover:border-mist hover:text-day"
              >
                ← {t("back")}
              </button>
            )}
          </div>
          <div className="flex items-center gap-5">
            {preview && (
              <p className="hidden text-right font-mono text-sm text-mist sm:block">
                {t("runningTotal")}:{" "}
                <span className="text-day">
                  {formatUsd(preview.totalMin)}–{formatUsd(preview.totalMax)}
                </span>{" "}
                · {preview.estimatedWeeks} {t("weeks")}
              </p>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                className="horizon-gradient rounded-full px-7 py-3.5 text-sm font-medium text-night transition-opacity hover:opacity-90"
              >
                {t("next")} →
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={status === "sending"}
                className="horizon-gradient rounded-full px-7 py-3.5 text-sm font-medium text-night transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {t("submit")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline estimate result (Step 5) — mirrors the /estimate/[token] page. */
function ResultView({ result }: { result: EstimateResponse }) {
  const t = useTranslations("calc.result");
  const { pricing, proposal, token } = result;

  return (
    <div className="text-day">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-apricot">
        {t("eyebrow")}
      </p>
      <h2 className="font-display mt-3 text-2xl font-medium md:text-3xl">
        {proposal.projectTitle}
      </h2>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-line-night bg-night-deep p-6">
          <p className="font-mono text-xs uppercase tracking-wide text-mist">
            {t("investment")}
          </p>
          <p className="font-display mt-2 text-2xl md:text-3xl">
            {formatUsd(pricing.totalMin)} – {formatUsd(pricing.totalMax)}
          </p>
        </div>
        <div className="rounded-xl border border-line-night bg-night-deep p-6">
          <p className="font-mono text-xs uppercase tracking-wide text-mist">
            {t("timeline")}
          </p>
          <p className="font-display mt-2 text-2xl md:text-3xl">
            {pricing.estimatedWeeks} {t("weeksShort")}
          </p>
        </div>
      </div>

      <ResultSection title={t("summary")}>
        <p className="leading-relaxed text-mist">{proposal.summary}</p>
      </ResultSection>

      <ResultSection title={t("scope")}>
        <ResultList items={proposal.scope} />
      </ResultSection>

      <ResultSection title={t("features")}>
        <ResultList items={proposal.features} />
      </ResultSection>

      <ResultSection title={t("stack")}>
        <div className="flex flex-wrap gap-2">
          {proposal.recommendedStack.map((s) => (
            <span
              key={s}
              className="rounded-full border border-line-night px-3 py-1.5 text-xs text-mist"
            >
              {s}
            </span>
          ))}
        </div>
      </ResultSection>

      <ResultSection title={t("recommendations")}>
        <ResultList items={proposal.recommendations} />
      </ResultSection>

      <ResultSection title={t("nextSteps")}>
        <ResultList items={proposal.nextSteps} />
      </ResultSection>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a
          href={`/api/proposal/${token}`}
          className="horizon-gradient rounded-full px-7 py-3.5 text-sm font-medium text-night transition-opacity hover:opacity-90"
        >
          {t("download")}
        </a>
        <Link
          href={`/estimate/${token}`}
          className="font-mono text-sm text-mist underline-offset-4 transition-colors hover:text-day hover:underline"
        >
          {t("permanent")} →
        </Link>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-mist/70">{t("disclaimer")}</p>
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h3 className="font-mono text-xs uppercase tracking-wide text-mist">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ResultList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed text-mist">
          <span className="text-apricot">—</span>
          {item}
        </li>
      ))}
    </ul>
  );
}
