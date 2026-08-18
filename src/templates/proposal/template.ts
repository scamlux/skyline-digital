import type { Proposal } from "@/lib/ai/schema";
import { formatUsd } from "@/lib/utils";

/**
 * Code-controlled HTML template for the commercial proposal PDF.
 *
 * ⚠️ VISUAL PLACEHOLDER. Layout/typography/colors are intentionally simple and
 * will be replaced to match the provided PDF reference. The data binding and
 * structure (cover → scope → pricing → next steps) are final. The AI never
 * generates this HTML — it only supplies the structured `proposal` data.
 */
export function renderProposalHtml(proposal: Proposal, meta?: { date?: string }): string {
  const date = meta?.date ?? "";
  const list = (items: string[]) =>
    items.map((i) => `<li>${escapeHtml(i)}</li>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; }
  .page { padding: 48px 56px; }
  .cover { min-height: 42vh; display: flex; flex-direction: column; justify-content: center; }
  .brand { font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #6b7280; }
  h1 { font-size: 34px; margin: 12px 0 8px; }
  .muted { color: #6b7280; font-size: 13px; }
  .price { font-size: 40px; font-weight: 700; margin: 6px 0; }
  section { margin-top: 28px; }
  h2 { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #6b7280; margin-bottom: 10px; }
  ul { padding-left: 18px; }
  li { margin: 4px 0; font-size: 14px; line-height: 1.5; }
  p { font-size: 14px; line-height: 1.6; }
  .grid { display: flex; gap: 40px; }
  .grid > div { flex: 1; }
  .divider { height: 1px; background: #e5e7eb; margin: 28px 0; }
  .tags span { display: inline-block; border: 1px solid #d1d5db; border-radius: 999px; padding: 4px 12px; font-size: 12px; margin: 0 6px 6px 0; }
  footer { margin-top: 40px; color: #9ca3af; font-size: 11px; }
</style>
</head>
<body>
  <div class="page">
    <div class="cover">
      <div class="brand">Skyline Digital · Commercial proposal</div>
      <h1>${escapeHtml(proposal.projectTitle)}</h1>
      ${date ? `<div class="muted">${escapeHtml(date)}</div>` : ""}
    </div>

    <section>
      <h2>Summary</h2>
      <p>${escapeHtml(proposal.summary)}</p>
    </section>

    <div class="divider"></div>

    <div class="grid">
      <div>
        <h2>Estimated investment</h2>
        <div class="price">${formatUsd(proposal.price.min)} – ${formatUsd(proposal.price.max)}</div>
      </div>
      <div>
        <h2>Timeline</h2>
        <div class="price">${proposal.timeline.weeks} weeks</div>
        <ul>${list(proposal.timeline.phases)}</ul>
      </div>
    </div>

    <section>
      <h2>Objectives</h2>
      <ul>${list(proposal.objectives)}</ul>
    </section>

    <section>
      <h2>Scope</h2>
      <ul>${list(proposal.scope)}</ul>
    </section>

    <section>
      <h2>Included features</h2>
      <ul>${list(proposal.features)}</ul>
    </section>

    <section>
      <h2>Recommended stack</h2>
      <div class="tags">${proposal.recommendedStack.map((s) => `<span>${escapeHtml(s)}</span>`).join("")}</div>
    </section>

    <section>
      <h2>Recommendations</h2>
      <ul>${list(proposal.recommendations)}</ul>
    </section>

    <section>
      <h2>Next steps</h2>
      <ul>${list(proposal.nextSteps)}</ul>
    </section>

    <footer>Skyline Digital — this proposal is an estimate and not a binding offer.</footer>
  </div>
</body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
