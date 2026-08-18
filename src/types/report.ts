import type { EvaluationResult } from "@/lib/api/sessions";

export type ReportSectionName =
  | "metadata"
  | "transcript"
  | "evaluation"
  | "coaching"
  | "learning_plan"
  | "summary";
export type SectionState = "loading" | "loaded" | "empty" | "failed";
export type ReportCompletion = "complete" | "partial" | "not_applicable" | "failed";
export type FailureClass =
  | "backend"
  | "frontend"
  | "http_e2e"
  | "data_contract"
  | "accessibility"
  | "responsive_layout"
  | "export"
  | "print"
  | "infrastructure";

export interface ReportFailure {
  class: FailureClass;
  code: string;
  safe_message: string;
  correlation_id: string | null;
}

export interface SectionEnvelope<T = unknown> {
  name: ReportSectionName;
  state: SectionState;
  data: T | null;
  unavailable_reason: string | null;
  failure: ReportFailure | null;
  updated_at: string | null;
}

export interface EvaluationVersionMetadata {
  id: string | null;
  number: number | null;
  name: string | null;
  kind: "current" | "legacy";
}

export interface NormalizedReport {
  session_id: string;
  session: Record<string, unknown> | null;
  report_status: ReportCompletion;
  score_status: "evaluated" | "not_applicable" | "unavailable" | "failed";
  evaluation_version: EvaluationVersionMetadata;
  evaluation_kind: "current" | "legacy";
  sections: Record<ReportSectionName, SectionEnvelope>;
  correlation_id: string | null;
}

export type NormalizedEvaluation =
  | { kind: "canonical"; status: "evaluated" | "not_applicable"; result: EvaluationResult }
  | { kind: "legacy"; status: "evaluated" | "not_applicable"; result: EvaluationResult };
