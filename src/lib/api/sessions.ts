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

  return response.json();
}

function parseEvaluationResult(payload: unknown): EvaluationResult {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Evaluation response has an invalid shape");
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.session_id !== "string" || !Array.isArray(record.category_scores) || typeof record.overall_score !== "number") {
    throw new Error("Evaluation response has an invalid shape");
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

  return response.json();
}

export async function fetchLearningPlan(sessionId: string): Promise<LearningPlan> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/learning-plan`);

  if (!response.ok) {
    throw new Error(`Failed to fetch learning plan: ${response.status}`);
  }

  return response.json();
}
