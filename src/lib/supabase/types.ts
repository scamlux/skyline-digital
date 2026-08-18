import type { ProjectConfiguration, PricingResult } from "@/lib/pricing/types";
import type { Proposal } from "@/lib/ai/schema";

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  messenger: string | null;
  service: string | null;
  budget: string | null;
  message: string | null;
  created_at: string;
}

export interface EstimateRow {
  id: string;
  lead_id: string | null;
  token: string;
  project_type: string;
  configuration: ProjectConfiguration;
  pricing_result: PricingResult;
  ai_result: Proposal;
  created_at: string;
}
