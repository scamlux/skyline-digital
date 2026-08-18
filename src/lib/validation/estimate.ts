import { z } from "zod";
import { addonKeys, featuresByType } from "@/lib/pricing/rules";

const projectTypes = [
  "website",
  "webApp",
  "mobileApp",
  "ai",
  "automation",
  "uiux",
  "other",
] as const;

/** Structured configuration submitted by the calculator wizard. */
export const projectConfigurationSchema = z
  .object({
    projectType: z.enum(projectTypes),
    features: z.array(z.string()).max(30).default([]),
    addons: z.array(z.enum(addonKeys as [string, ...string[]])).max(10).default([]),
    urgency: z.enum(["normal", "urgent"]).default("normal"),
  })
  .superRefine((val, ctx) => {
    // Features must belong to the selected project type's catalog.
    const allowed = new Set(featuresByType[val.projectType]);
    for (const f of val.features) {
      if (!allowed.has(f)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["features"],
          message: `Feature "${f}" is not valid for ${val.projectType}`,
        });
      }
    }
  });

/** Contact / project info collected in Step 4 of the wizard. */
export const projectInfoSchema = z.object({
  projectName: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  deadline: z.string().trim().max(120).optional().default(""),
  budget: z.string().trim().max(120).optional().default(""),
  contactName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  messenger: z.string().trim().max(200).optional().default(""),
  // Anti-spam honeypot: must stay empty.
  company: z.string().max(0).optional().default(""),
});

/** Full payload POSTed to /api/estimate. */
export const estimateRequestSchema = z.object({
  configuration: projectConfigurationSchema,
  info: projectInfoSchema,
});

export type EstimateRequest = z.infer<typeof estimateRequestSchema>;
export type ProjectInfo = z.infer<typeof projectInfoSchema>;
