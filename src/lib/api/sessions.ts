export interface PersonaSummary {
  name: string;
  communication_style: string;
  emotional_state: string;
}

export type SessionStatus =
  | "pending"
  | "active"
  | "completed"
  | "error";

export interface SessionResponse {
  id: string;
  scenario_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  persona: PersonaSummary | null;
  status: SessionStatus;
  created_at: string;
  ended_at: string | null;
  standard_id?: string | null;
  standard_version_id?: string | null;
  standard_version_number?: number | null;
  standard_name?: string | null;
}

export interface TranscriptEntry {
  speaker: "agent" | "debtor";
  text: string;
  timestamp: string;
  sequence_number: number;
}

export interface AppliedTechnique {
  technique_name: string;
  execution_type: "Executed Properly" | "Weak Execution" | "Misapplied";
  execution_description: string;
  evidence_sequence_numbers: number[];
}

export interface MissedTechnique {
  technique_name: string;
  reason: string;
}

export interface CompetencyScore {
  category: string;
  score: number;
  strengths: { description: string; category: string; transcript_excerpt: string }[];
  weaknesses: { description: string; category: string; transcript_excerpt: string }[];
}

export interface RubricEvidence {
  sequence_number: number;
  speaker: "agent" | "debtor";
  excerpt: string;
  explanation: string;
}

export interface RubricStrength {
  criterion_id: string;
  explanation: string;
  evidence_sequence_numbers: number[];
}

export interface RubricViolation {
  violation_id: string;
  explanation: string;
  evidence_sequence_numbers: number[];
}

export interface RubricRecommendationInput {
  criterion_id: string;
  transcript_sequence_number: number;
  need: string;
}

export interface RubricCategoryScore {
  rubric_block_id: string;
  category: string;
  raw_score: number | null;
  penalty_total: number;
  penalized_score: number | null;
  weight: number;
  weighted_contribution: number;
  passing_score: number;
  passed: boolean;
  evidence: RubricEvidence[];
  strengths: RubricStrength[];
  violations: RubricViolation[];
  failed_criteria: string[];
  recommendation_inputs: RubricRecommendationInput[];
}

export interface RubricRecommendation {
  rubric_block_id: string;
  block_name?: string | null;
  criterion_id: string;
  criterion_name?: string | null;
  display_order?: number | null;
  evidence_sequence_number: number;
  source_speaker?: "agent" | "debtor" | null;
  source_excerpt?: string | null;
  explanation: string;
  recommended_response: string;
  coaching_advice: string;
  standard_version_id?: string | null;
  standard_version_number?: number | null;
}

export interface RubricCoachingBlock {
  rubric_block_id: string;
  block_name: string;
  display_order: number;
  recommendations: RubricRecommendation[];
}

export interface RubricCoaching {
  standard_version_id?: string | null;
  standard_version_number?: number | null;
  blocks: RubricCoachingBlock[];
}

export interface CanonicalEvaluationResult {
  status: "evaluated" | "not_applicable";
  summary: string;
  categories: RubricCategoryScore[];
  weighted_total: number;
  passing_score: number;
  passed: boolean;
  applied_techniques: { techniques_used: AppliedTechnique[]; reason_if_empty: string };
  missed_opportunities: { missed_techniques: MissedTechnique[]; reason_if_empty: string };
  recommendations: RubricRecommendation[];
}

export interface EvaluationResult {
  session_id: string;
  category_scores: CompetencyScore[];
  overall_score: number;
  strengths: { description: string; category: string; transcript_excerpt: string }[];
  weaknesses: { description: string; category: string; transcript_excerpt: string }[];
  is_too_short: boolean;
  negotiation_standard_version_id?: string | null;
  standard_name?: string | null;
  standard_version_number?: number | null;
  weighted_total?: number | null;
  passing_score?: number | null;
  passed?: boolean | null;
  standard_snapshot?: Record<string, unknown> | null;
  rubric_result?: CanonicalEvaluationResult | null;
}

export interface MistakeItem {
  transcript_position: number;
  transcript_excerpt: string;
  category: string;
  explanation: string;
  recommended_alternative: string;
}

export interface CoachingReport {
  session_id: string;
  mistakes_by_category: Record<string, MistakeItem[]>;
  total_mistakes: number;
  no_mistakes: boolean;
  rubric_coaching?: RubricCoaching | null;
  rubric_recommendations?: RubricRecommendation[];
  rubric_recommendations_by_block?: Record<string, RubricRecommendation[]>;
}

export interface LearningPlanItem {
  category: string;
  score: number;
  recommended_scenario?: string | null;
  scenario_id?: string | null;
  rubric_block_id?: string | null;
  criterion_id?: string | null;
  practice_focus?: string | null;
  standard_version_id?: string | null;
  standard_version_number?: number | null;
}

export interface LearningPlan {
  session_id: string;
  weak_competencies: LearningPlanItem[];
  all_passing: boolean;
  standard_version_id?: string | null;
  standard_version_number?: number | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

<<<<<<< HEAD
export type ArtifactErrorCategory =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "request"
  | "server"
  | "network"
  | "decode"
  | "validation";

export class SessionArtifactError extends Error {
  readonly category: ArtifactErrorCategory;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    category: ArtifactErrorCategory,
    message: string,
    options: { status?: number; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "SessionArtifactError";
    this.category = category;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

type ArtifactParser<T> = (payload: unknown) => T;

function artifactLabel(artifact: string): string {
  return artifact.charAt(0).toUpperCase() + artifact.slice(1);
}

function safeStatusError(artifact: string, status: number): SessionArtifactError {
  const label = artifactLabel(artifact);
  if (status === 401) {
    return new SessionArtifactError(
      "unauthorized",
      "Sign in again to view this result",
      { status },
    );
  }
  if (status === 403) {
    return new SessionArtifactError(
      "forbidden",
      "You do not have access to this session",
      { status },
    );
  }
  if (status === 404) {
    return new SessionArtifactError(
      "not_found",
      "This artifact is not available",
      { status },
    );
  }
  if (status >= 500 && status <= 599) {
    return new SessionArtifactError(
      "server",
      `Unable to load the ${label.toLowerCase()} right now. Please try again.`,
      { status, retryable: true },
    );
  }
  return new SessionArtifactError(
    "request",
    `Unable to load the ${label.toLowerCase()}. Please try again.`,
    { status },
  );
}

async function requestArtifact<T>(
  artifact: string,
  path: string,
  parse: ArtifactParser<T>,
): Promise<T> {
  const token = typeof window !== "undefined"
    ? window.localStorage?.getItem("cat_token") ?? null
    : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers,
    });
  } catch {
    throw new SessionArtifactError(
      "network",
      `Unable to load the ${artifact.toLowerCase()} right now. Please try again.`,
      { retryable: true },
    );
  }

  if (!response.ok) {
    throw safeStatusError(artifact, response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SessionArtifactError(
      "decode",
      `Unable to read the ${artifact.toLowerCase()} response. Please try again.`,
      { retryable: true },
    );
  }

  try {
    return parse(payload);
  } catch {
    throw new SessionArtifactError(
      "validation",
      `${artifactLabel(artifact)} response is invalid. Please try again.`,
    );
  }
}

export async function createSession(scenarioId: string): Promise<SessionResponse> {
=======
export async function createSession(
  scenarioId: string,
  campaignId?: string,
): Promise<SessionResponse> {
>>>>>>> e904fdc92547a3c4311e0627222c20c55c8d99c9
  const token = typeof window !== "undefined" ? localStorage.getItem("cat_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      scenario_id: scenarioId,
      ...(campaignId ? { campaign_id: campaignId } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : body.detail?.message ?? body.message;
    throw new Error(detail || `Failed to create session: ${response.status}`);
  }

  return response.json();
}

export async function endSession(sessionId: string): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/end`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Failed to end session: ${response.status}`);
  }

  return response.json();
}

export async function fetchTranscript(sessionId: string): Promise<TranscriptEntry[]> {
  return requestArtifact(
    "transcript",
    `/api/sessions/${sessionId}/transcript`,
    parseTranscriptPayload,
  );
}
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalText(value: unknown): boolean {
  return value === undefined || value === null || isNonEmptyString(value);
}

function isOptionalVersion(value: unknown): boolean {
  return value === undefined || value === null || (isInteger(value) && value >= 1);
}

function invalidResponse(name: string): never {
  throw new Error(`${name} response has an invalid shape`);
}

function hasUniqueNumbers(values: unknown, requireValue = false): values is number[] {
  if (!Array.isArray(values) || (requireValue && values.length === 0)) return false;
  if (!values.every((value) => isInteger(value) && value >= 0)) return false;
  return new Set(values).size === values.length;
}

function isValidTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

/** Scenario IDs are backend-resolved UUIDs; scenario-* is retained for legacy fixtures. */
export function isValidScenarioId(value: unknown): value is string {
  return typeof value === "string" && (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    || /^scenario-[A-Za-z0-9]+$/.test(value)
  );
}

function validatePinnedFields(value: UnknownRecord): boolean {
  return isOptionalText(value.standard_version_id) && isOptionalVersion(value.standard_version_number);
}

function validateEvidence(value: unknown): value is RubricEvidence {
  if (!isRecord(value)) return false;
  return isInteger(value.sequence_number) && value.sequence_number >= 0
    && (value.speaker === "agent" || value.speaker === "debtor")
    && isNonEmptyString(value.excerpt) && isNonEmptyString(value.explanation);
}

function validateEvidenceList(value: unknown, requireValue = false): value is RubricEvidence[] {
  if (!Array.isArray(value) || (requireValue && value.length === 0) || !value.every(validateEvidence)) return false;
  return new Set(value.map((item) => item.sequence_number)).size === value.length;
}

function validateRecommendation(value: unknown): value is RubricRecommendation {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.rubric_block_id)
    && isOptionalText(value.block_name)
    && isNonEmptyString(value.criterion_id)
    && isOptionalText(value.criterion_name)
    && (value.display_order === undefined || value.display_order === null || (isInteger(value.display_order) && value.display_order >= 0))
    && isInteger(value.evidence_sequence_number) && value.evidence_sequence_number >= 0
    && (value.source_speaker === undefined || value.source_speaker === null || value.source_speaker === "agent" || value.source_speaker === "debtor")
    && isOptionalText(value.source_excerpt)
    && isNonEmptyString(value.explanation)
    && isNonEmptyString(value.recommended_response)
    && isNonEmptyString(value.coaching_advice)
    && validatePinnedFields(value);
}

function recommendationKey(value: RubricRecommendation): string {
  return `${value.rubric_block_id}\u0000${value.criterion_id}\u0000${value.evidence_sequence_number}`;
}

function validateRecommendationList(value: unknown): value is RubricRecommendation[] {
  if (!Array.isArray(value) || !value.every(validateRecommendation)) return false;
  const keys = value.map(recommendationKey);
  return new Set(keys).size === keys.length;
}

function validateTechniqueEnvelope(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.techniques_used) || !isNonEmptyString(value.reason_if_empty)) return false;
  if (!value.techniques_used.every((technique) => {
    if (!isRecord(technique)) return false;
    return isNonEmptyString(technique.technique_name)
      && ["Executed Properly", "Weak Execution", "Misapplied"].includes(String(technique.execution_type))
      && isNonEmptyString(technique.execution_description)
      && hasUniqueNumbers(technique.evidence_sequence_numbers, true);
  })) return false;
  const names = value.techniques_used.map((technique) => String((technique as UnknownRecord).technique_name).toLocaleLowerCase());
  return new Set(names).size === names.length;
}

function validateMissedEnvelope(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.missed_techniques) || !isNonEmptyString(value.reason_if_empty)) return false;
  if (!value.missed_techniques.every((technique) => isRecord(technique)
    && isNonEmptyString(technique.technique_name) && isNonEmptyString(technique.reason))) return false;
  const names = value.missed_techniques.map((technique) => String((technique as UnknownRecord).technique_name).toLocaleLowerCase());
  return new Set(names).size === names.length;
}

function validateRubricCoaching(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.blocks) || !validatePinnedFields(value)) return false;
  const blockIds = new Set<string>();
  const displayOrders = new Set<number>();
  for (const rawBlock of value.blocks) {
    if (!isRecord(rawBlock) || !isNonEmptyString(rawBlock.rubric_block_id) || !isNonEmptyString(rawBlock.block_name)
      || !isInteger(rawBlock.display_order) || rawBlock.display_order < 0 || !Array.isArray(rawBlock.recommendations)
      || !validateRecommendationList(rawBlock.recommendations)) return false;
    if (blockIds.has(rawBlock.rubric_block_id) || displayOrders.has(rawBlock.display_order)) return false;
    blockIds.add(rawBlock.rubric_block_id);
    displayOrders.add(rawBlock.display_order);
    for (const rawRecommendation of rawBlock.recommendations) {
      const recommendation = rawRecommendation as RubricRecommendation;
      if (recommendation.rubric_block_id !== rawBlock.rubric_block_id
        || (recommendation.display_order !== undefined && recommendation.display_order !== null && recommendation.display_order !== rawBlock.display_order)) return false;
    }
  }
  return true;
}

function validateMistake(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isInteger(value.transcript_position) && value.transcript_position >= 0
    && isNonEmptyString(value.transcript_excerpt)
    && isNonEmptyString(value.category)
    && isNonEmptyString(value.explanation)
    && isNonEmptyString(value.recommended_alternative);
}

function validateCanonicalCategory(value: unknown, status: CanonicalEvaluationResult["status"]): value is RubricCategoryScore {
  if (!isRecord(value) || !isNonEmptyString(value.rubric_block_id) || !isNonEmptyString(value.category)
    || !((value.raw_score === null) || (isFiniteNumber(value.raw_score) && value.raw_score >= 0 && value.raw_score <= 100))
    || !(isInteger(value.penalty_total) && value.penalty_total >= 0)
    || !((value.penalized_score === null) || (isFiniteNumber(value.penalized_score) && value.penalized_score >= 0 && value.penalized_score <= 100))
    || !(isFiniteNumber(value.weight) && value.weight >= 0 && value.weight <= 100)
    || !(isFiniteNumber(value.weighted_contribution) && value.weighted_contribution >= 0 && value.weighted_contribution <= 100)
    || !(isFiniteNumber(value.passing_score) && value.passing_score >= 0 && value.passing_score <= 100)
    || typeof value.passed !== "boolean"
    || !validateEvidenceList(value.evidence)
    || !Array.isArray(value.strengths) || !Array.isArray(value.violations) || !Array.isArray(value.failed_criteria)
    || !Array.isArray(value.recommendation_inputs)) return false;
  if (status === "evaluated" && value.raw_score === null) return false;
  if (status === "not_applicable" && (value.raw_score !== null || value.penalized_score !== null)) return false;
  const evidenceSequences = new Set(value.evidence.map((item) => item.sequence_number));
  const referenced = (items: unknown[], idField: "criterion_id" | "violation_id") => items.every((item) => isRecord(item)
    && isNonEmptyString(item[idField]) && isNonEmptyString(item.explanation)
    && hasUniqueNumbers(item.evidence_sequence_numbers, true)
    && (item.evidence_sequence_numbers as number[]).every((sequence) => evidenceSequences.has(sequence)));
  if (!referenced(value.strengths, "criterion_id") || !referenced(value.violations, "violation_id")) return false;
  const failed = value.failed_criteria.filter(isNonEmptyString);
  if (failed.length !== value.failed_criteria.length || new Set(failed).size !== failed.length) return false;
  const inputs = value.recommendation_inputs;
  if (!inputs.every((item) => isRecord(item) && isNonEmptyString(item.criterion_id)
    && isInteger(item.transcript_sequence_number) && item.transcript_sequence_number >= 0
    && isNonEmptyString(item.need)
    && evidenceSequences.has(item.transcript_sequence_number))) return false;
  return new Set(inputs.map((item) => `${(item as UnknownRecord).criterion_id}\u0000${(item as UnknownRecord).transcript_sequence_number}`)).size === inputs.length;
}

function validateCanonicalResult(value: unknown): value is CanonicalEvaluationResult {
  if (!isRecord(value) || (value.status !== "evaluated" && value.status !== "not_applicable")
    || !isNonEmptyString(value.summary) || !Array.isArray(value.categories)
    || !(isFiniteNumber(value.weighted_total) && value.weighted_total >= 0 && value.weighted_total <= 100)
    || !(isFiniteNumber(value.passing_score) && value.passing_score >= 0 && value.passing_score <= 100)
    || typeof value.passed !== "boolean" || !validateTechniqueEnvelope(value.applied_techniques)
    || !validateMissedEnvelope(value.missed_opportunities) || !validateRecommendationList(value.recommendations)) return false;
  const categories = value.categories;
  if (!categories.every((category) => validateCanonicalCategory(category, value.status))) return false;
  const blockIds = new Set(categories.map((category) => String((category as UnknownRecord).rubric_block_id)));
  if (blockIds.size !== categories.length) return false;
  if (value.status === "not_applicable" && (value.passed || value.weighted_total !== 0 || value.recommendations.length > 0)) return false;
  return value.recommendations.every((recommendation) => {
    const item = recommendation as RubricRecommendation;
    const category = categories.find((candidate) => isRecord(candidate) && candidate.rubric_block_id === item.rubric_block_id) as UnknownRecord | undefined;
    if (!category || !Array.isArray(category.evidence)) return false;
    return (category.evidence as RubricEvidence[]).some((evidence) => evidence.sequence_number === item.evidence_sequence_number);
  });
}

function parseTranscriptPayload(payload: unknown): TranscriptEntry[] {
  if (!Array.isArray(payload)) invalidResponse("Transcript");
  const entries = payload as unknown[];
  if (!entries.every((entry) => isRecord(entry)
    && (entry.speaker === "agent" || entry.speaker === "debtor")
    && isNonEmptyString(entry.text) && isValidTimestamp(entry.timestamp)
    && isInteger(entry.sequence_number) && entry.sequence_number >= 0)) invalidResponse("Transcript");
  const sequences = entries.map((entry) => (entry as UnknownRecord).sequence_number as number);
  if (new Set(sequences).size !== sequences.length || sequences.some((sequence, index) => index > 0 && sequence <= sequences[index - 1])) invalidResponse("Transcript");
  return payload as TranscriptEntry[];
}

function parseCoachingPayload(payload: unknown, expectedSessionId?: string): CoachingReport {
  if (!isRecord(payload) || !isNonEmptyString(payload.session_id) || (expectedSessionId && payload.session_id !== expectedSessionId)
    || !isRecord(payload.mistakes_by_category) || !Object.values(payload.mistakes_by_category).every((items) => Array.isArray(items) && items.every(validateMistake))
    || !isInteger(payload.total_mistakes) || payload.total_mistakes < 0 || typeof payload.no_mistakes !== "boolean") invalidResponse("Coaching");
  if (payload.rubric_coaching !== undefined && payload.rubric_coaching !== null && !validateRubricCoaching(payload.rubric_coaching)) invalidResponse("Coaching");
  if (payload.rubric_recommendations !== undefined && !validateRecommendationList(payload.rubric_recommendations)) invalidResponse("Coaching");
  if (payload.rubric_recommendations_by_block !== undefined) {
    if (!isRecord(payload.rubric_recommendations_by_block) || !Object.values(payload.rubric_recommendations_by_block).every(validateRecommendationList)) invalidResponse("Coaching");
  }
  const hasCanonical = (payload.rubric_coaching !== undefined && payload.rubric_coaching !== null)
    || (Array.isArray(payload.rubric_recommendations) && payload.rubric_recommendations.length > 0)
    || (isRecord(payload.rubric_recommendations_by_block) && Object.keys(payload.rubric_recommendations_by_block).length > 0);
  if (hasCanonical && Object.values(payload.mistakes_by_category).some((items) => Array.isArray(items) && items.length > 0)) invalidResponse("Coaching");
  const grouped = isRecord(payload.rubric_coaching) ? payload.rubric_coaching.blocks as unknown[] : [];
  const groupedRecommendations = grouped.flatMap((block) => isRecord(block) && Array.isArray(block.recommendations) ? block.recommendations : []);
  const flatRecommendations = Array.isArray(payload.rubric_recommendations) ? payload.rubric_recommendations : undefined;
  if (flatRecommendations && groupedRecommendations.length > 0 && JSON.stringify(flatRecommendations.map(recommendationKey)) !== JSON.stringify(groupedRecommendations.map((item) => recommendationKey(item as RubricRecommendation)))) invalidResponse("Coaching");
  if (isRecord(payload.rubric_recommendations_by_block) && grouped.length > 0) {
    for (const rawBlock of grouped) {
      if (!isRecord(rawBlock) || !Array.isArray(payload.rubric_recommendations_by_block[rawBlock.rubric_block_id as string])) invalidResponse("Coaching");
      const byBlock = payload.rubric_recommendations_by_block[rawBlock.rubric_block_id as string] as RubricRecommendation[];
      if (JSON.stringify(byBlock.map(recommendationKey)) !== JSON.stringify((rawBlock.recommendations as RubricRecommendation[]).map(recommendationKey))) invalidResponse("Coaching");
    }
  }
  return payload as unknown as CoachingReport;
}

function parseLearningPlanPayload(payload: unknown, expectedSessionId?: string): LearningPlan {
  if (!isRecord(payload) || !isNonEmptyString(payload.session_id) || (expectedSessionId && payload.session_id !== expectedSessionId)
    || !Array.isArray(payload.weak_competencies) || typeof payload.all_passing !== "boolean"
    || !validatePinnedFields(payload)) invalidResponse("Learning plan");
  if (payload.all_passing !== (payload.weak_competencies.length === 0)) invalidResponse("Learning plan");
  const identities = new Set<string>();
  for (const rawItem of payload.weak_competencies) {
    if (!isRecord(rawItem) || !isNonEmptyString(rawItem.category) || !(isFiniteNumber(rawItem.score) && rawItem.score >= 0 && rawItem.score <= 100)
      || !isOptionalText(rawItem.recommended_scenario) || !isOptionalText(rawItem.scenario_id)
      || !isOptionalText(rawItem.rubric_block_id) || !isOptionalText(rawItem.criterion_id) || !isOptionalText(rawItem.practice_focus)
      || !isOptionalVersion(rawItem.standard_version_number) || !isOptionalText(rawItem.standard_version_id)) invalidResponse("Learning plan");
    const hasBlock = rawItem.rubric_block_id !== undefined && rawItem.rubric_block_id !== null;
    const hasCriterion = rawItem.criterion_id !== undefined && rawItem.criterion_id !== null;
    if (hasBlock !== hasCriterion || (hasCriterion && !isNonEmptyString(rawItem.practice_focus))) invalidResponse("Learning plan");
    if (rawItem.scenario_id !== undefined && rawItem.scenario_id !== null && !isValidScenarioId(rawItem.scenario_id)) invalidResponse("Learning plan");
    const identity = hasCriterion ? `${rawItem.rubric_block_id}\u0000${rawItem.criterion_id}` : `legacy\u0000${rawItem.category}`;
    if (identities.has(identity)) invalidResponse("Learning plan");
    identities.add(identity);
  }
  return payload as unknown as LearningPlan;
}

function validateLegacyCompetency(value: unknown): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.category) || !(isFiniteNumber(value.score) && value.score >= 0 && value.score <= 100)
    || !Array.isArray(value.strengths) || !Array.isArray(value.weaknesses)) return false;
  const finding = (item: unknown) => isRecord(item) && isNonEmptyString(item.description) && isNonEmptyString(item.category) && isNonEmptyString(item.transcript_excerpt);
  return value.strengths.every(finding) && value.weaknesses.every(finding);
}

function parseEvaluationResult(payload: unknown, expectedSessionId?: string): EvaluationResult {
  if (!isRecord(payload) || !isNonEmptyString(payload.session_id) || (expectedSessionId && payload.session_id !== expectedSessionId)
    || !Array.isArray(payload.category_scores) || !payload.category_scores.every(validateLegacyCompetency)
    || !(isFiniteNumber(payload.overall_score) && payload.overall_score >= 0 && payload.overall_score <= 100)
    || !Array.isArray(payload.strengths) || !Array.isArray(payload.weaknesses) || !payload.strengths.every((item) => isRecord(item) && isNonEmptyString(item.description) && isNonEmptyString(item.category) && isNonEmptyString(item.transcript_excerpt))
    || !payload.weaknesses.every((item) => isRecord(item) && isNonEmptyString(item.description) && isNonEmptyString(item.category) && isNonEmptyString(item.transcript_excerpt))
    || typeof payload.is_too_short !== "boolean") invalidResponse("Evaluation");
  if (payload.rubric_result !== undefined && payload.rubric_result !== null && !validateCanonicalResult(payload.rubric_result)) invalidResponse("Evaluation");
  return payload as EvaluationResult;
}

export async function fetchEvaluation(sessionId: string): Promise<EvaluationResult> {
  return requestArtifact(
    "evaluation",
    `/api/sessions/${sessionId}/evaluation`,
    (payload) => parseEvaluationResult(payload, sessionId),
  );
}

export async function fetchCoaching(sessionId: string): Promise<CoachingReport> {
  return requestArtifact(
    "coaching",
    `/api/sessions/${sessionId}/coaching`,
    (payload) => parseCoachingPayload(payload, sessionId),
  );
}

export async function fetchLearningPlan(sessionId: string): Promise<LearningPlan> {
  return requestArtifact(
    "learning plan",
    `/api/sessions/${sessionId}/learning-plan`,
    (payload) => parseLearningPlanPayload(payload, sessionId),
  );
}
