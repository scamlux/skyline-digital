import type { ProjectConfiguration, PricingResult } from "@/lib/pricing/types";
import type { Proposal } from "@/lib/ai/schema";
import type { AuditScore, Finding, Measurement } from "@/lib/audit/types";

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
  /** Path inside the private `proposals` bucket; sign it to serve the PDF. */
  file_path: string | null;
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

/** A stored site audit (public /audit or radar). See migration 0005. */
export interface AuditRow {
  id: string;
  url: string;
  host: string;
  final_url: string | null;
  reachable: boolean;
  error_code: string | null;
  score_total: number | null;
  score_grade: string | null;
  categories: AuditScore["categories"] | null;
  measurement: Measurement;
  findings: Finding[] | null;
  email: string | null;
  lead_id: string | null;
  source: "public" | "radar" | null;
  created_at: string;
}

/** A company row for the radar (phase B). See migration 0005. */
export interface RadarCompanyRow {
  id: string;
  domain: string | null;
  name: string;
  industry: string | null;
  city: string | null;
  phone: string | null;
  instagram: string | null;
  directory: string;
  directory_url: string | null;
  has_site: boolean;
  class: "S" | "A" | "B" | "C" | null;
  last_audit_id: string | null;
  outreach_status: "NEW" | "QUEUED" | "SENT" | "REPLIED" | "WON" | "SKIP";
  outreach_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
