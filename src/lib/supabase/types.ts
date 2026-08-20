import type { ProjectConfiguration, PricingResult } from "@/lib/pricing/types";
import type { Proposal } from "@/lib/ai/schema";

export type LeadStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export interface LeadRow {
  id: string;
  lead_number: string;
  created_at: string;
  updated_at: string;

  client_name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;

  project_type: string | null;
  service: string | null;
  description: string | null;

  budget: string | null;
  deadline: string | null;

  status: LeadStatus;

  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;

  landing_page: string | null;
  referrer: string | null;

  ai_summary: string | null;
  calculated_price: number | null;
  currency: string | null;

  proposal_id: string | null;
  telegram_message_id: number | null;
  telegram_error: string | null;

  /** Legacy columns kept nullable for backward compatibility. */
  name?: string | null;
  messenger?: string | null;
  message?: string | null;
}

export type ProposalStatus = "CREATED" | "SENT" | "SEND_FAILED";

export interface ProposalRow {
  id: string;
  lead_id: string;
  estimate_id: string | null;
  created_at: string;
  version: number;
  title: string | null;
  content: Proposal | null;
  total_price: number | null;
  currency: string | null;
  valid_until: string | null;
  file_url: string | null;
  status: ProposalStatus;
  telegram_message_id: number | null;
  telegram_error: string | null;
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
