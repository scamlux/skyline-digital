import { z } from "zod";

/** Acquisition context attached to every lead (all optional). */
export const leadContextSchema = {
  source: z.string().trim().max(200).optional().default(""),
  utm_source: z.string().trim().max(200).optional().default(""),
  utm_medium: z.string().trim().max(200).optional().default(""),
  utm_campaign: z.string().trim().max(200).optional().default(""),
  utm_content: z.string().trim().max(200).optional().default(""),
  landing_page: z.string().trim().max(500).optional().default(""),
  referrer: z.string().trim().max(500).optional().default(""),
};

/** Contact form payload (POST /api/contact). */
export const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(60).optional().default(""),
  messenger: z.string().trim().max(200).optional().default(""),
  service: z.string().trim().max(80).optional().default(""),
  budget: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(1).max(2000),
  // Anti-spam honeypot: must stay empty.
  company: z.string().max(80).optional().default(""),
  hp: z.string().max(0).optional().default(""),
  ...leadContextSchema,
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
