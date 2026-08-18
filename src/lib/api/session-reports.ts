import {
  requestArtifact,
  requestArtifactBlobResponse,
  SessionArtifactError,
  type ArtifactBlobProgress,
} from "@/lib/api/artifacts";

export { SessionArtifactError } from "@/lib/api/artifacts";

export type ReportReasonCode =
  | "artifact_missing"
  | "empty_transcript"
  | "not_applicable"
  | "session_too_short"
  | "generation_pending"
  | "generation_failed"
  | "legacy_only"
  | "no_evidence"
  | "no_coaching"
  | "no_learning_plan";

export interface ReportReason {
  code: ReportReasonCode;
  message?: string;
}

export interface ReportSummary {
  session_id: string;
  scenario_id: string;
  agent_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  persona: { name: string; communication_style: string; emotional_state: string } | null;
  status: "pending" | "active" | "completed" | "error";
  created_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  standard_id: string | null;
  standard_version_id: string | null;
  standard_version_number: number | null;
  standard_name: string | null;
}

export interface ReportTranscriptEntry {
  speaker: "agent" | "debtor";
  text: string;
  timestamp: string;
  sequence_number: number;
}

export interface ReportSection {
  available: boolean;
  reason?: string | null;
  reason_code?: ReportReasonCode | null;
  [key: string]: unknown;
}

export interface SessionReportPayload {
  summary: ReportSummary;
  transcript: ReportSection & { entries: ReportTranscriptEntry[] };
  evaluation: ReportSection & {
    mode: "canonical" | "legacy" | "legacy_only" | "not_applicable" | "too_short" | null;
    canonical?: Record<string, unknown> | null;
    legacy?: Record<string, unknown> | null;
  };
  coaching: ReportSection & {
    mode: "canonical" | "legacy" | null;
    blocks: Array<Record<string, unknown>>;
    legacy_mistakes_by_category: Record<string, Array<Record<string, unknown>>>;
  };
  learning_plan: ReportSection & {
    items: Array<Record<string, unknown>>;
    all_passing: boolean | null;
  };
}

export interface SessionReport {
  session_id: string;
  report_version: number;
  status: "ready";
  content_hash: string;
  created_at: string;
  payload: SessionReportPayload;
}

export interface ReportAttemptMetadata {
  status: "pending" | "failed";
  report_version: number;
  reason: ReportReason;
  created_at: string;
  updated_at: string;
}

export interface ReportStatusBase {
  session_id: string;
}

export interface MissingReportStatus extends ReportStatusBase {
  status: "missing";
  reason: ReportReason;
  latest_attempt: null;
  report: null;
}

export interface IncompleteReportStatus extends ReportStatusBase {
  status: "incomplete";
  reason: ReportReason;
  missing_sections: ReportReasonCode[];
  latest_attempt?: ReportAttemptMetadata | null;
  report: null;
}

export interface GeneratingReportStatus extends ReportStatusBase {
  status: "generating";
  reason: ReportReason;
  latest_attempt: ReportAttemptMetadata;
  report: null;
}

export interface FailedReportStatus extends ReportStatusBase {
  status: "failed";
  reason: ReportReason;
  latest_attempt: ReportAttemptMetadata;
  report: null;
}

export interface ReadyReportStatus extends ReportStatusBase {
  status: "ready";
  report: SessionReport;
  latest_attempt?: ReportAttemptMetadata | null;
}

export interface TerminalReportStatus extends ReportStatusBase {
  status: "not_applicable" | "too_short" | "legacy_only" | "empty_transcript" | "no_evidence";
  reason: ReportReason;
  report: SessionReport;
  latest_attempt?: null;
}

export type ReportStatus =
  | MissingReportStatus
  | IncompleteReportStatus
  | GeneratingReportStatus
  | FailedReportStatus
  | ReadyReportStatus
  | TerminalReportStatus;

type UnknownRecord = Record<string, unknown>;
const REASON_CODES: readonly ReportReasonCode[] = [
  "artifact_missing", "empty_transcript", "not_applicable", "session_too_short",
  "generation_pending", "generation_failed", "legacy_only", "no_evidence",
  "no_coaching", "no_learning_plan",
];
const SESSION_STATUSES = ["pending", "active", "completed", "error"] as const;
const EVALUATION_MODES = ["canonical", "legacy", "not_applicable", "too_short"] as const;
const TERMINAL_STATUSES = ["not_applicable", "too_short", "legacy_only", "empty_transcript", "no_evidence"] as const;

export interface ReportRequestOptions {
  signal?: AbortSignal;
}

function requestReport<T>(path: string, parse: (payload: unknown) => T, options: ReportRequestOptions = {}): Promise<T> {
  return requestArtifact("report", path, parse, {
    init: { signal: options.signal },
    messages: {
      decode: "Unable to read the report response. Please try again.",
      validation: "Report response is invalid. Please try again.",
    },
  });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function integer(value: unknown, minimum = 0): value is number {
  return finite(value) && Number.isInteger(value) && value >= minimum;
}

function bounded(value: unknown, minimum = 0, maximum = 100): value is number {
  return finite(value) && value >= minimum && value <= maximum;
}

function optionalString(value: unknown): boolean {
  return value === undefined || value === null || nonEmpty(value);
}

function optionalNumber(value: unknown, minimum = 0, maximum = Number.POSITIVE_INFINITY): boolean {
  return value === undefined || value === null || (finite(value) && value >= minimum && value <= maximum);
}

function optionalInteger(value: unknown, minimum = 1): boolean {
  return value === undefined || value === null || integer(value, minimum);
}

function validDate(value: unknown): value is string {
  if (!nonEmpty(value) || !Number.isFinite(Date.parse(value))) return false;
  // Backend datetimes are timezone-aware. Requiring an offset prevents a
  // locale-dependent timestamp from changing the report's meaning.
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
}

function dateNotBefore(left: string, right: string): boolean {
  return Date.parse(left) >= Date.parse(right);
}

function validReasonCode(value: unknown): value is ReportReasonCode {
  return typeof value === "string" && REASON_CODES.includes(value as ReportReasonCode);
}

function validReason(value: unknown, expected?: ReportReasonCode): value is ReportReason {
  if (!isRecord(value) || !validReasonCode(value.code)) return false;
  if (!optionalString(value.message)) return false;
  return expected === undefined || value.code === expected;
}

function sectionReasonAllowed(section: "transcript" | "evaluation" | "coaching" | "learning_plan", code: ReportReasonCode): boolean {
  const allowed: Record<typeof section, readonly ReportReasonCode[]> = {
    transcript: ["artifact_missing", "empty_transcript"],
    evaluation: ["artifact_missing", "not_applicable", "session_too_short", "legacy_only", "no_evidence"],
    coaching: ["artifact_missing", "no_coaching"],
    learning_plan: ["artifact_missing", "no_learning_plan"],
  };
  return allowed[section].includes(code);
}

function inferredSectionReason(
  section: "transcript" | "evaluation" | "coaching" | "learning_plan",
  value: UnknownRecord,
): ReportReasonCode | null {
  if (validReasonCode(value.reason_code)) return value.reason_code;
  if (value.reason_code !== undefined && value.reason_code !== null) return null;
  if (section === "transcript" && Array.isArray(value.entries) && value.entries.length === 0) return "empty_transcript";
  if (value.available === false) {
    if (section === "coaching" && typeof value.reason === "string" && /no coaching/i.test(value.reason)) return "no_coaching";
    if (section === "learning_plan" && typeof value.reason === "string" && /no plan|no learning plan/i.test(value.reason)) return "no_learning_plan";
    return "artifact_missing";
  }
  if (section === "evaluation" && value.mode === "not_applicable") return "not_applicable";
  if (section === "evaluation" && value.mode === "too_short") return "session_too_short";
  if (section === "evaluation" && value.mode === "legacy") return "legacy_only";
  return null;
}

function validateSectionEnvelope(
  value: unknown,
  section: "transcript" | "evaluation" | "coaching" | "learning_plan",
  contentEmpty: boolean,
): value is UnknownRecord {
  if (!isRecord(value) || typeof value.available !== "boolean" || !optionalString(value.reason)) return false;
  const code = inferredSectionReason(section, value);
  if (value.reason_code !== undefined && value.reason_code !== null && !validReasonCode(value.reason_code)) return false;
  if (code !== null && !sectionReasonAllowed(section, code)) return false;
  if (!value.available && (code === null || !contentEmpty)) return false;
  if (value.available && code === "artifact_missing") return false;
  if (value.available && code === "empty_transcript" && !contentEmpty) return false;
  if (value.available && (code === "no_coaching" || code === "no_learning_plan")) return false;
  return true;
}

function validatePersona(value: unknown): boolean {
  return value === null || (isRecord(value) && nonEmpty(value.name)
    && nonEmpty(value.communication_style) && nonEmpty(value.emotional_state));
}

function validateSummary(value: unknown, expectedSessionId?: string): value is ReportSummary {
  if (!isRecord(value)) return false;
  const required = [
    "session_id", "scenario_id", "agent_id", "campaign_id", "campaign_name", "persona", "status",
    "created_at", "ended_at", "duration_seconds", "standard_id", "standard_version_id",
    "standard_version_number", "standard_name",
  ];
  if (!required.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return false;
  if (!nonEmpty(value.session_id) || (expectedSessionId !== undefined && value.session_id !== expectedSessionId)
    || !nonEmpty(value.scenario_id) || !nonEmpty(value.agent_id)
    || !SESSION_STATUSES.includes(value.status as typeof SESSION_STATUSES[number])
    || !validDate(value.created_at) || !validatePersona(value.persona)
    || !optionalString(value.campaign_id) || !optionalString(value.campaign_name)
    || !optionalString(value.ended_at) || !optionalNumber(value.duration_seconds, 0)
    || !optionalString(value.standard_id) || !optionalString(value.standard_version_id)
    || !optionalInteger(value.standard_version_number, 1) || !optionalString(value.standard_name)) return false;
  if (value.ended_at !== null && !validDate(value.ended_at)) return false;
  if (value.ended_at !== null && !dateNotBefore(value.ended_at, value.created_at as string)) return false;
  if (value.status === "completed" && value.ended_at === null) return false;
  return true;
}

function validateTranscript(value: unknown): value is ReportTranscriptEntry[] {
  if (!Array.isArray(value)) return false;
  const sequences: number[] = [];
  const identities = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry) || !Object.prototype.hasOwnProperty.call(entry, "speaker")
      || !Object.prototype.hasOwnProperty.call(entry, "text") || !Object.prototype.hasOwnProperty.call(entry, "timestamp")
      || !Object.prototype.hasOwnProperty.call(entry, "sequence_number") || (entry.speaker !== "agent" && entry.speaker !== "debtor")
      || !nonEmpty(entry.text) || !validDate(entry.timestamp) || !integer(entry.sequence_number)) return false;
    const sequence = entry.sequence_number;
    if (sequences.length > 0 && sequence <= sequences[sequences.length - 1]) return false;
    const identity = `${entry.speaker}\u0000${entry.text}\u0000${entry.timestamp}\u0000${sequence}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
    sequences.push(sequence);
  }
  return true;
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function validateReferenceList(value: unknown, transcriptSequences: Set<number>, requireValue = false): value is number[] {
  return Array.isArray(value) && (!requireValue || value.length > 0)
    && value.every((item) => integer(item) && transcriptSequences.has(item))
    && unique(value.map(String));
}

function validateEvidence(value: unknown, transcript: UnknownRecord, transcriptSequences: Set<number>): boolean {
  if (!isRecord(value) || !integer(value.sequence_number) || !transcriptSequences.has(value.sequence_number)
    || (value.speaker !== "agent" && value.speaker !== "debtor") || !nonEmpty(value.excerpt) || !nonEmpty(value.explanation)) return false;
  const entry = (transcript.__entries as ReportTranscriptEntry[]).find((candidate) => candidate.sequence_number === value.sequence_number);
  return !entry || entry.speaker === value.speaker;
}

function validatePinned(value: UnknownRecord): boolean {
  return optionalString(value.standard_version_id) && optionalInteger(value.standard_version_number, 1);
}

function validateTechniqueEnvelope(value: unknown, transcriptSequences: Set<number>): boolean {
  if (!isRecord(value) || !Array.isArray(value.techniques_used) || !nonEmpty(value.reason_if_empty)) return false;
  const names: string[] = [];
  for (const item of value.techniques_used) {
    if (!isRecord(item) || !nonEmpty(item.technique_name)
      || !["Executed Properly", "Weak Execution", "Misapplied"].includes(String(item.execution_type))
      || !nonEmpty(item.execution_description) || !validateReferenceList(item.evidence_sequence_numbers, transcriptSequences, true)) return false;
    names.push(item.technique_name.toLocaleLowerCase());
  }
  return unique(names);
}

function validateMissedEnvelope(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.missed_techniques) || !nonEmpty(value.reason_if_empty)) return false;
  const names: string[] = [];
  for (const item of value.missed_techniques) {
    if (!isRecord(item) || !nonEmpty(item.technique_name) || !nonEmpty(item.reason)) return false;
    names.push(item.technique_name.toLocaleLowerCase());
  }
  return unique(names);
}

function validateCanonical(value: unknown, transcript: UnknownRecord, transcriptSequences: Set<number>): boolean {
  if (!isRecord(value) || (value.status !== "evaluated" && value.status !== "not_applicable")
    || !nonEmpty(value.summary) || !Array.isArray(value.categories)
    || !bounded(value.weighted_total) || !bounded(value.passing_score)
    || typeof value.passed !== "boolean" || !validatePinned(value)
    || !validateTechniqueEnvelope(value.applied_techniques, transcriptSequences)
    || !validateMissedEnvelope(value.missed_opportunities) || !Array.isArray(value.recommendations)) return false;
  const blockIds: string[] = [];
  for (const category of value.categories) {
    if (!isRecord(category) || !nonEmpty(category.rubric_block_id) || !nonEmpty(category.category)
      || !(category.raw_score === null || bounded(category.raw_score))
      || !integer(category.penalty_total) || category.penalty_total > 100
      || !(category.penalized_score === null || bounded(category.penalized_score))
      || !bounded(category.weight) || !bounded(category.weighted_contribution) || !bounded(category.passing_score)
      || typeof category.passed !== "boolean" || !Array.isArray(category.evidence)
      || !Array.isArray(category.strengths) || !Array.isArray(category.violations)
      || !Array.isArray(category.failed_criteria) || !Array.isArray(category.recommendation_inputs)) return false;
    if (value.status === "evaluated" && category.raw_score === null) return false;
    if (value.status === "not_applicable" && (category.raw_score !== null || category.penalized_score !== null)) return false;
    blockIds.push(category.rubric_block_id);
    const evidenceIds: string[] = [];
    for (const evidence of category.evidence) {
      if (!validateEvidence(evidence, transcript, transcriptSequences)) return false;
      const item = evidence as UnknownRecord;
      evidenceIds.push(`${item.sequence_number}\u0000${item.speaker}\u0000${item.excerpt}`);
    }
    if (!unique(evidenceIds)) return false;
    const evidenceSequences = new Set((category.evidence as UnknownRecord[]).map((item) => item.sequence_number as number));
    const findings = (items: unknown[], id: "criterion_id" | "violation_id") => items.every((item) => isRecord(item)
      && nonEmpty(item[id]) && nonEmpty(item.explanation)
      && validateReferenceList(item.evidence_sequence_numbers, evidenceSequences, true));
    if (!findings(category.strengths, "criterion_id") || !findings(category.violations, "violation_id")) return false;
    if (!category.failed_criteria.every(nonEmpty) || !unique(category.failed_criteria as string[])) return false;
    const inputIds: string[] = [];
    for (const input of category.recommendation_inputs) {
      if (!isRecord(input) || !nonEmpty(input.criterion_id) || !integer(input.transcript_sequence_number)
        || !transcriptSequences.has(input.transcript_sequence_number) || !nonEmpty(input.need)) return false;
      inputIds.push(`${input.criterion_id}\u0000${input.transcript_sequence_number}`);
    }
    if (!unique(inputIds)) return false;
  }
  if (!unique(blockIds)) return false;
  const recommendationIds: string[] = [];
  for (const recommendation of value.recommendations) {
    if (!validateRecommendation(recommendation, transcript, transcriptSequences)) return false;
    const item = recommendation as UnknownRecord;
    if (!blockIds.includes(item.rubric_block_id as string)) return false;
    recommendationIds.push(`${item.rubric_block_id}\u0000${item.criterion_id}\u0000${item.evidence_sequence_number}`);
  }
  return unique(recommendationIds);
}

function validateRecommendation(value: unknown, transcript: UnknownRecord, transcriptSequences: Set<number>): boolean {
  if (!isRecord(value) || !nonEmpty(value.rubric_block_id) || !optionalString(value.block_name)
    || !nonEmpty(value.criterion_id) || !optionalString(value.criterion_name)
    || !optionalInteger(value.display_order, 0) || !integer(value.evidence_sequence_number)
    || !transcriptSequences.has(value.evidence_sequence_number)
    || !(value.source_speaker === undefined || value.source_speaker === null || value.source_speaker === "agent" || value.source_speaker === "debtor")
    || !optionalString(value.source_excerpt) || !nonEmpty(value.explanation) || !nonEmpty(value.recommended_response)
    || !nonEmpty(value.coaching_advice) || !validatePinned(value)) return false;
  const entry = (transcript.__entries as ReportTranscriptEntry[]).find((candidate) => candidate.sequence_number === value.evidence_sequence_number);
  return (!entry || value.source_speaker == null || entry.speaker === value.source_speaker)
    && (!entry || value.source_excerpt == null || value.source_excerpt === entry.text || entry.text.includes(String(value.source_excerpt)));
}

function validateLegacy(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.category_scores) || !bounded(value.overall_score)
    || !Array.isArray(value.strengths) || !Array.isArray(value.weaknesses)) return false;
  const categories: string[] = [];
  for (const category of value.category_scores) {
    if (!isRecord(category) || !nonEmpty(category.category) || !bounded(category.score)
      || !Array.isArray(category.strengths) || !Array.isArray(category.weaknesses)) return false;
    categories.push(category.category);
    const finding = (item: unknown) => isRecord(item) && nonEmpty(item.description) && nonEmpty(item.category) && nonEmpty(item.transcript_excerpt);
    if (!category.strengths.every(finding) || !category.weaknesses.every(finding)) return false;
  }
  const finding = (item: unknown) => isRecord(item) && nonEmpty(item.description) && nonEmpty(item.category) && nonEmpty(item.transcript_excerpt);
  return unique(categories) && value.strengths.every(finding) && value.weaknesses.every(finding);
}

function validateEvaluation(value: unknown, transcript: UnknownRecord, transcriptSequences: Set<number>): boolean {
  if (!isRecord(value) || !validateSectionEnvelope(value, "evaluation", value.canonical == null && value.legacy == null)
    || !Object.prototype.hasOwnProperty.call(value, "mode")
    || (value.mode !== null && !EVALUATION_MODES.includes(value.mode as typeof EVALUATION_MODES[number]))
    || !Object.prototype.hasOwnProperty.call(value, "canonical") || !Object.prototype.hasOwnProperty.call(value, "legacy")
    || !optionalNumber(value.weighted_total, 0, 100) || !optionalInteger(value.passing_score, 0)
    || (value.passed !== undefined && value.passed !== null && typeof value.passed !== "boolean")
    || !optionalInteger(value.standard_version_number, 1)) return false;
  if (value.passing_score !== undefined && value.passing_score !== null && (!integer(value.passing_score, 0) || value.passing_score > 100)) return false;
  if (value.mode === "canonical" && (!isRecord(value.canonical) || value.legacy !== null || !validateCanonical(value.canonical, transcript, transcriptSequences))) return false;
  if (value.mode === "legacy" && (!isRecord(value.legacy) || value.canonical !== null || !validateLegacy(value.legacy))) return false;
  if (value.mode === "not_applicable" && (value.canonical !== null && !validateCanonical(value.canonical, transcript, transcriptSequences))) return false;
  if (value.mode === "too_short" && (value.canonical !== null || value.legacy !== null)) return false;
  if (value.available && value.mode === null) return false;
  if (!value.available && (value.mode !== null || value.canonical !== null || value.legacy !== null
    || value.weighted_total !== undefined && value.weighted_total !== null
    || value.passing_score !== undefined && value.passing_score !== null
    || value.passed !== undefined && value.passed !== null)) return false;
  const code = inferredSectionReason("evaluation", value);
  if ((value.mode === "not_applicable" && code !== "not_applicable")
    || (value.mode === "too_short" && code !== "session_too_short")
    || (value.mode === "legacy" && code !== null && code !== "legacy_only")
    || (code === "no_evidence" && value.mode !== "canonical")
    || (code === "no_evidence" && isRecord(value.canonical) && Array.isArray(value.canonical.categories)
      && value.canonical.categories.some((category) => isRecord(category) && Array.isArray(category.evidence) && category.evidence.length > 0))
    || ((code === "not_applicable" || code === "session_too_short") && (value.weighted_total != null || value.passing_score != null || value.passed != null))) return false;
  return true;
}

function validateCoaching(value: unknown, transcript: UnknownRecord, transcriptSequences: Set<number>): boolean {
  if (!isRecord(value) || !validateSectionEnvelope(value, "coaching", (!Array.isArray(value.blocks) || value.blocks.length === 0)
    && (!isRecord(value.legacy_mistakes_by_category) || Object.keys(value.legacy_mistakes_by_category).length === 0))
    || !Object.prototype.hasOwnProperty.call(value, "mode") || (value.mode !== null && value.mode !== "canonical" && value.mode !== "legacy")
    || !Array.isArray(value.blocks) || !isRecord(value.legacy_mistakes_by_category)
    || !optionalInteger(value.total_mistakes, 0) || (value.no_mistakes !== undefined && value.no_mistakes !== null && typeof value.no_mistakes !== "boolean")) return false;
  if (!value.available && (value.mode !== null || value.blocks.length > 0 || Object.keys(value.legacy_mistakes_by_category).length > 0)) return false;
  if (value.available && value.mode === null) return false;
  if (value.mode === "legacy" && value.blocks.length > 0) return false;
  if (value.mode === "canonical" && Object.values(value.legacy_mistakes_by_category as Record<string, unknown[]>).some((items) => items.length > 0)) return false;
  const blockIds: string[] = [];
  const orders: number[] = [];
  const criteria: string[] = [];
  const evidences: string[] = [];
  for (const block of value.blocks) {
    if (!isRecord(block) || !nonEmpty(block.rubric_block_id) || !nonEmpty(block.block_name)
      || !integer(block.display_order) || !Array.isArray(block.recommendations)) return false;
    if (orders.length > 0 && block.display_order <= orders[orders.length - 1]) return false;
    blockIds.push(block.rubric_block_id); orders.push(block.display_order);
    for (const recommendation of block.recommendations) {
      if (!validateRecommendation(recommendation, transcript, transcriptSequences)) return false;
      const item = recommendation as UnknownRecord;
      if (item.rubric_block_id !== block.rubric_block_id
        || (item.display_order !== undefined && item.display_order !== null && item.display_order !== block.display_order)) return false;
      const criterion = `${block.rubric_block_id}\u0000${item.criterion_id}`;
      const evidence = `${criterion}\u0000${item.evidence_sequence_number}`;
      criteria.push(criterion); evidences.push(evidence);
    }
  }
  if (!unique(blockIds) || !unique(criteria) || !unique(evidences)) return false;
  for (const [category, mistakes] of Object.entries(value.legacy_mistakes_by_category)) {
    if (!nonEmpty(category) || !Array.isArray(mistakes)) return false;
    for (const mistake of mistakes) {
      if (!isRecord(mistake) || !integer(mistake.transcript_position) || !transcriptSequences.has(mistake.transcript_position)
        || !nonEmpty(mistake.transcript_excerpt) || !nonEmpty(mistake.category) || !nonEmpty(mistake.explanation)
        || !nonEmpty(mistake.recommended_alternative)) return false;
    }
  }
  return true;
}

function validateLearningPlan(value: unknown, summary: ReportSummary): boolean {
  if (!isRecord(value) || !validateSectionEnvelope(value, "learning_plan", !Array.isArray(value.items) || value.items.length === 0)
    || !Array.isArray(value.items) || !Object.prototype.hasOwnProperty.call(value, "all_passing")
    || (value.all_passing !== null && typeof value.all_passing !== "boolean")) return false;
  if (!value.available && (value.items.length > 0 || value.all_passing !== null)) return false;
  const identities: string[] = [];
  for (const item of value.items) {
    if (!isRecord(item) || !nonEmpty(item.category) || !bounded(item.score)
      || !optionalString(item.recommended_scenario) || !optionalString(item.scenario_id)
      || !optionalString(item.rubric_block_id) || !optionalString(item.criterion_id) || !optionalString(item.practice_focus)
      || !optionalString(item.standard_version_id) || !optionalInteger(item.standard_version_number, 1)) return false;
    const hasBlock = item.rubric_block_id !== undefined && item.rubric_block_id !== null;
    const hasCriterion = item.criterion_id !== undefined && item.criterion_id !== null;
    if (hasBlock !== hasCriterion || (hasBlock && !nonEmpty(item.practice_focus))) return false;
    if (item.scenario_id !== undefined && item.scenario_id !== null && item.scenario_id !== summary.scenario_id) return false;
    const identity = hasBlock ? `${item.rubric_block_id}\u0000${item.criterion_id}` : `legacy\u0000${item.category}`;
    identities.push(identity);
  }
  return unique(identities);
}

function validatePayload(value: unknown, expectedSessionId?: string): value is SessionReportPayload {
  if (!isRecord(value) || !validateSummary(value.summary, expectedSessionId)) return false;
  const transcript = value.transcript;
  if (!isRecord(transcript) || !Array.isArray(transcript.entries) || !validateSectionEnvelope(transcript, "transcript", transcript.entries.length === 0)
    || !validateTranscript(transcript.entries)) return false;
  const transcriptContext: UnknownRecord = { __entries: transcript.entries };
  const sequences = new Set(transcript.entries.map((entry) => entry.sequence_number));
  if (!validateEvaluation(value.evaluation, transcriptContext, sequences)
    || !validateCoaching(value.coaching, transcriptContext, sequences)
    || !validateLearningPlan(value.learning_plan, value.summary)) return false;
  return true;
}

function invalid(): never {
  throw new Error("Session report response has an invalid shape");
}

function parseReadyReport(value: unknown, expectedSessionId?: string): SessionReport {
  if (!isRecord(value) || !nonEmpty(value.session_id) || (expectedSessionId !== undefined && value.session_id !== expectedSessionId)
    || !integer(value.report_version, 1) || value.status !== "ready" || typeof value.content_hash !== "string"
    || !/^[0-9a-f]{64}$/i.test(value.content_hash) || !validDate(value.created_at)
    || !validatePayload(value.payload, value.session_id)) invalid();
  return value as unknown as SessionReport;
}

export function parseReportPayload(payload: unknown, expectedSessionId?: string): SessionReport {
  return parseReadyReport(payload, expectedSessionId);
}

function validateAttempt(value: unknown): value is ReportAttemptMetadata {
  if (!isRecord(value) || (value.status !== "pending" && value.status !== "failed")
    || !integer(value.report_version, 1) || !validReason(value.reason, value.status === "pending" ? "generation_pending" : "generation_failed")
    || !validDate(value.created_at) || !validDate(value.updated_at) || !dateNotBefore(value.updated_at, value.created_at)) return false;
  return true;
}

function parseStatus(payload: unknown, expectedSessionId?: string): ReportStatus {
  if (!isRecord(payload) || !nonEmpty(payload.session_id) || (expectedSessionId !== undefined && payload.session_id !== expectedSessionId)
    || ("payload" in payload)) invalid();
  const status = payload.status;
  if (status === "missing") {
    if (!validReason(payload.reason, "artifact_missing") || payload.latest_attempt !== null || payload.report !== null) invalid();
    return payload as unknown as MissingReportStatus;
  }
  if (status === "incomplete") {
    if (!validReason(payload.reason, "artifact_missing") || !Array.isArray(payload.missing_sections) || payload.missing_sections.length === 0
      || !payload.missing_sections.every((code) => validReasonCode(code) && code !== "generation_pending" && code !== "generation_failed")
      || !unique(payload.missing_sections as string[]) || (payload.latest_attempt !== undefined && payload.latest_attempt !== null && !validateAttempt(payload.latest_attempt))
      || payload.report !== null) invalid();
    return payload as unknown as IncompleteReportStatus;
  }
  if (status === "generating" || status === "failed") {
    const expected = status === "generating" ? "generation_pending" : "generation_failed";
    if (!validReason(payload.reason, expected) || !validateAttempt(payload.latest_attempt)
      || payload.latest_attempt.status !== (status === "generating" ? "pending" : "failed") || payload.report !== null) invalid();
    return payload as unknown as GeneratingReportStatus | FailedReportStatus;
  }
  if (status === "ready") {
    if (!isRecord(payload.report) || !parseReadyReport(payload.report, payload.session_id)
      || (payload.latest_attempt !== undefined && payload.latest_attempt !== null
        && (!validateAttempt(payload.latest_attempt) || payload.latest_attempt.status !== "failed"))) invalid();
    return payload as unknown as ReadyReportStatus;
  }
  if (typeof status === "string" && TERMINAL_STATUSES.includes(status as typeof TERMINAL_STATUSES[number])) {
    if (!isRecord(payload.reason) || !validReasonCode(payload.reason.code) || payload.reason.code !== (status === "too_short" ? "session_too_short" : status)
      || !isRecord(payload.report) || (payload.latest_attempt !== undefined && payload.latest_attempt !== null)) invalid();
    const report = parseReadyReport(payload.report, payload.session_id);
    const evaluation = report.payload.evaluation;
    const transcript = report.payload.transcript;
    if (status === "not_applicable" && evaluation.mode !== "not_applicable") invalid();
    if (status === "too_short" && evaluation.mode !== "too_short") invalid();
    if (status === "legacy_only" && (evaluation.mode !== "legacy" || evaluation.canonical != null)) invalid();
    if (status === "empty_transcript" && transcript.entries.length !== 0) invalid();
    if (status === "no_evidence" && (evaluation.mode !== "canonical" || evaluation.reason_code !== "no_evidence")) invalid();
    return payload as unknown as TerminalReportStatus;
  }
  invalid();
}

export function parseReportStatus(payload: unknown, expectedSessionId?: string): ReportStatus {
  return parseStatus(payload, expectedSessionId);
}

export function fetchSessionReport(sessionId: string, options: ReportRequestOptions = {}): Promise<SessionReport> {
  return requestReport(`/api/sessions/${encodeURIComponent(sessionId)}/report`, (payload) => parseReportPayload(payload, sessionId), options);
}

export function fetchSessionReportStatus(sessionId: string, options: ReportRequestOptions = {}): Promise<ReportStatus> {
  return requestReport(`/api/sessions/${encodeURIComponent(sessionId)}/report/status`, (payload) => parseReportStatus(payload, sessionId), options);
}

export function isRetryableReportError(error: unknown): error is SessionArtifactError {
  return error instanceof SessionArtifactError
    && (error.category === "network" || error.category === "decode" || error.category === "server");
}

export function generateSessionReport(sessionId: string): Promise<SessionReport> {
  return requestArtifact("report generation", `/api/sessions/${encodeURIComponent(sessionId)}/report`, (payload) => parseReportPayload(payload, sessionId), {
    init: { method: "POST" },
    messages: {
      network: "Unable to generate the report right now. Please try again.",
      request: "Unable to generate the report. Please try again.",
      server: "Unable to generate the report. Please try again.",
      conflict: "The session must be completed before a report can be generated",
      decode: "Unable to read the report response. Please try again.",
      validation: "Report response is invalid. Please try again.",
    },
  });
}

export type ReportDownloadFormat = "json" | "csv" | "pdf";

export interface SessionReportDownload {
  blob: Blob;
  filename: string;
}

export interface DownloadRequestOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ArtifactBlobProgress) => void;
}

const DOWNLOAD_FORMATS: readonly ReportDownloadFormat[] = ["json", "csv", "pdf"];

function fallbackFilename(sessionId: string, format: ReportDownloadFormat): string {
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+|\.+$/g, "").slice(0, 80) || "session";
  return `session-report_${safeSessionId}.${format}`;
}

/** Parse only a simple RFC 6266 filename value; unsafe values use the deterministic fallback. */
export function parseReportFilename(
  contentDisposition: string | null | undefined,
  sessionId: string,
  format: ReportDownloadFormat,
): string {
  const fallback = fallbackFilename(sessionId, format);
  if (!contentDisposition) return fallback;
  const encoded = contentDisposition.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  const plain = contentDisposition.match(/(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;\s]+))/i);
  let candidate = encoded ?? plain?.[1] ?? plain?.[2];
  if (!candidate) return fallback;
  try {
    candidate = encoded ? decodeURIComponent(candidate) : candidate;
  } catch {
    return fallback;
  }
  if (/[\\/\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  candidate = candidate.replace(/[<>:"|?*]/g, "").trim();
  candidate = candidate.replace(/^[.\s]+|[.\s]+$/g, "").slice(0, 120);
  if (!candidate || candidate === "." || candidate === ".." || candidate.includes("..")) return fallback;
  const extension = `.${format}`;
  if (!candidate.toLowerCase().endsWith(extension)) candidate += extension;
  return candidate;
}

function downloadMessages() {
  return {
    network: "Unable to download the report right now. Please try again.",
    request: "Unable to download the report. Please try again.",
    server: "Unable to download the report. Please try again.",
    decode: "Unable to read the report response. Please try again.",
    notFound: "This report is not available",
  };
}

export async function downloadSessionReportArtifact(
  sessionId: string,
  format: ReportDownloadFormat,
  options: DownloadRequestOptions = {},
): Promise<SessionReportDownload> {
  if (!DOWNLOAD_FORMATS.includes(format)) {
    throw new SessionArtifactError("validation", "This report format is not supported.");
  }
  const result = await requestArtifactBlobResponse(
    "report",
    `/api/sessions/${encodeURIComponent(sessionId)}/report/export?format=${format}`,
    {
      init: { signal: options.signal },
      onProgress: options.onProgress,
      messages: downloadMessages(),
    },
  );
  if (!(result.blob instanceof Blob) || result.blob.size === 0) {
    throw new SessionArtifactError("decode", "Unable to read the report response. Please try again.");
  }
  return {
    blob: result.blob,
    filename: parseReportFilename(result.headers.get("Content-Disposition"), sessionId, format),
  };
}

export function downloadSessionReport(sessionId: string, format: ReportDownloadFormat): Promise<Blob> {
  return downloadSessionReportArtifact(sessionId, format).then(({ blob }) => blob);
}
