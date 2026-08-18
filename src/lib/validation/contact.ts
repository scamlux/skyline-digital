import { z } from "zod";

/** Contact form payload (POST /api/contact). */
export const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  messenger: z.string().trim().max(200).optional().default(""),
  service: z.string().trim().max(80).optional().default(""),
  budget: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(1).max(2000),
  // Anti-spam honeypot: must stay empty.
  company: z.string().max(0).optional().default(""),
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
