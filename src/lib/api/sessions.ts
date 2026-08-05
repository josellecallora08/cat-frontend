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
  campaign_id?: string | null;
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
  applied_techniques: { techniques_used: unknown[]; reason_if_empty: string };
  missed_opportunities: { missed_techniques: unknown[]; reason_if_empty: string };
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
}

export interface LearningPlan {
  session_id: string;
  weak_competencies: LearningPlanItem[];
  all_passing: boolean;
  standard_version_id?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function createSession(scenarioId: string): Promise<SessionResponse> {
  const token = typeof window !== "undefined" ? localStorage.getItem("cat_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ scenario_id: scenarioId }),
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
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/transcript`);

  if (!response.ok) {
    throw new Error(`Failed to fetch transcript: ${response.status}`);
  }

  return parseTranscriptPayload(await response.json());
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

function invalidResponse(name: string): never {
  throw new Error(`${name} response has an invalid shape`);
}

function validateEvidence(value: unknown): value is RubricEvidence {
  if (!isRecord(value)) return false;
  return isInteger(value.sequence_number) && value.sequence_number >= 0
    && (value.speaker === "agent" || value.speaker === "debtor")
    && typeof value.excerpt === "string" && value.excerpt.length > 0
    && typeof value.explanation === "string" && value.explanation.length > 0;
}

function validateRecommendation(value: unknown): value is RubricRecommendation {
  if (!isRecord(value)) return false;
  const optionalSource = value.source_speaker === undefined || value.source_speaker === null
    || value.source_speaker === "agent" || value.source_speaker === "debtor";
  const optionalExcerpt = value.source_excerpt === undefined || value.source_excerpt === null
    || typeof value.source_excerpt === "string";
  return typeof value.rubric_block_id === "string"
    && typeof value.criterion_id === "string"
    && isInteger(value.evidence_sequence_number) && value.evidence_sequence_number >= 0
    && optionalSource && optionalExcerpt
    && typeof value.explanation === "string"
    && typeof value.recommended_response === "string"
    && typeof value.coaching_advice === "string";
}

function validateRubricCoaching(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.blocks)) return false;
  return value.blocks.every((block) => {
    if (!isRecord(block) || typeof block.rubric_block_id !== "string" || typeof block.block_name !== "string" || !isInteger(block.display_order) || !Array.isArray(block.recommendations)) return false;
    return block.recommendations.every(validateRecommendation);
  });
}

function validateMistake(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isInteger(value.transcript_position) && value.transcript_position >= 0
    && typeof value.transcript_excerpt === "string"
    && typeof value.category === "string"
    && typeof value.explanation === "string"
    && typeof value.recommended_alternative === "string";
}

function validateCanonicalCategory(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const arrays = [value.evidence, value.strengths, value.violations, value.failed_criteria, value.recommendation_inputs];
  return typeof value.rubric_block_id === "string"
    && typeof value.category === "string"
    && (value.raw_score === null || isFiniteNumber(value.raw_score))
    && isFiniteNumber(value.penalty_total)
    && (value.penalized_score === null || isFiniteNumber(value.penalized_score))
    && isFiniteNumber(value.weight)
    && isFiniteNumber(value.weighted_contribution)
    && isFiniteNumber(value.passing_score)
    && typeof value.passed === "boolean"
    && arrays.every(Array.isArray)
    && (value.evidence as unknown[]).every(validateEvidence)
    && (value.strengths as unknown[]).every((item) => isRecord(item) && typeof item.criterion_id === "string" && typeof item.explanation === "string" && Array.isArray(item.evidence_sequence_numbers))
    && (value.violations as unknown[]).every((item) => isRecord(item) && typeof item.violation_id === "string" && typeof item.explanation === "string" && Array.isArray(item.evidence_sequence_numbers))
    && (value.failed_criteria as unknown[]).every((item) => typeof item === "string")
    && (value.recommendation_inputs as unknown[]).every((item) => isRecord(item) && typeof item.criterion_id === "string" && isInteger(item.transcript_sequence_number) && typeof item.need === "string");
}

function validateCanonicalResult(value: unknown): value is CanonicalEvaluationResult {
  if (!isRecord(value)) return false;
  const recommendations = value.recommendations;
  return (value.status === "evaluated" || value.status === "not_applicable")
    && typeof value.summary === "string" && value.summary.length > 0
    && Array.isArray(value.categories)
    && value.categories.every(validateCanonicalCategory)
    && isFiniteNumber(value.weighted_total)
    && isFiniteNumber(value.passing_score)
    && typeof value.passed === "boolean"
    && Array.isArray(recommendations)
    && recommendations.every(validateRecommendation);
}

function parseTranscriptPayload(payload: unknown): TranscriptEntry[] {
  if (!Array.isArray(payload) || !payload.every((entry) => {
    if (!isRecord(entry)) return false;
    return (entry.speaker === "agent" || entry.speaker === "debtor")
      && typeof entry.text === "string" && entry.text.length > 0
      && typeof entry.timestamp === "string"
      && isInteger(entry.sequence_number) && entry.sequence_number >= 0;
  })) invalidResponse("Transcript");
  return payload as TranscriptEntry[];
}

function parseCoachingPayload(payload: unknown): CoachingReport {
  if (!isRecord(payload)
    || typeof payload.session_id !== "string"
    || !isRecord(payload.mistakes_by_category)
    || !Object.values(payload.mistakes_by_category).every((items) => Array.isArray(items) && items.every(validateMistake))
    || !isInteger(payload.total_mistakes) || payload.total_mistakes < 0
    || typeof payload.no_mistakes !== "boolean") invalidResponse("Coaching");
  if (payload.rubric_coaching !== undefined && payload.rubric_coaching !== null && !validateRubricCoaching(payload.rubric_coaching)) invalidResponse("Coaching");
  if (payload.rubric_recommendations !== undefined
    && (!Array.isArray(payload.rubric_recommendations) || !payload.rubric_recommendations.every(validateRecommendation))) invalidResponse("Coaching");
  return payload as unknown as CoachingReport;
}

function parseLearningPlanPayload(payload: unknown): LearningPlan {
  if (!isRecord(payload) || typeof payload.session_id !== "string"
    || !Array.isArray(payload.weak_competencies) || typeof payload.all_passing !== "boolean"
    || !payload.weak_competencies.every((item) => {
      if (!isRecord(item)) return false;
      return typeof item.category === "string" && isFiniteNumber(item.score) && item.score >= 0 && item.score <= 100
        && (item.scenario_id === undefined || item.scenario_id === null || typeof item.scenario_id === "string")
        && (item.rubric_block_id === undefined || item.rubric_block_id === null || typeof item.rubric_block_id === "string")
        && (item.criterion_id === undefined || item.criterion_id === null || typeof item.criterion_id === "string")
        && (item.practice_focus === undefined || item.practice_focus === null || typeof item.practice_focus === "string");
    })) invalidResponse("Learning plan");
  return payload as unknown as LearningPlan;
}

function parseEvaluationResult(payload: unknown): EvaluationResult {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Evaluation response has an invalid shape");
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.session_id !== "string" || !Array.isArray(record.category_scores) || typeof record.overall_score !== "number") {
    throw new Error("Evaluation response has an invalid shape");
  }
  if (record.rubric_result !== undefined && record.rubric_result !== null && !validateCanonicalResult(record.rubric_result)) {
    invalidResponse("Evaluation");
  }
  return payload as EvaluationResult;
}

export async function fetchEvaluation(sessionId: string): Promise<EvaluationResult> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/evaluation`);

  if (!response.ok) {
    throw new Error(`Failed to fetch evaluation: ${response.status}`);
  }

  return parseEvaluationResult(await response.json());
}

export async function fetchCoaching(sessionId: string): Promise<CoachingReport> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/coaching`);

  if (!response.ok) {
    throw new Error(`Failed to fetch coaching report: ${response.status}`);
  }

  return parseCoachingPayload(await response.json());
}

export async function fetchLearningPlan(sessionId: string): Promise<LearningPlan> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/learning-plan`);

  if (!response.ok) {
    throw new Error(`Failed to fetch learning plan: ${response.status}`);
  }

  return parseLearningPlanPayload(await response.json());
}
