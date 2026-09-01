import { z } from "zod";
import { leadContextSchema } from "@/lib/validation/contact";

/** Fast public audit (POST /api/audit) — just a URL. */
export const auditRequestSchema = z.object({
  url: z.string().trim().min(1).max(2000),
});

/** Full report + lead (POST /api/audit/report). */
export const auditReportRequestSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  email: z.string().trim().email().max(200),
  name: z.string().trim().max(120).optional().default(""),
  // Anti-spam honeypot: must stay empty, like the contact/estimate forms.
  hp: z.string().max(0).optional().default(""),
  // Cloudflare Turnstile token; verified server-side (skipped when unconfigured).
  turnstileToken: z.string().max(4000).optional().default(""),
  ...leadContextSchema,
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;
export type AuditReportRequest = z.infer<typeof auditReportRequestSchema>;
