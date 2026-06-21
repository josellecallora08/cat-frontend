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
  persona: PersonaSummary | null;
  status: SessionStatus;
  created_at: string;
  ended_at: string | null;
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

export interface EvaluationResult {
  session_id: string;
  category_scores: CompetencyScore[];
  overall_score: number;
  strengths: { description: string; category: string; transcript_excerpt: string }[];
  weaknesses: { description: string; category: string; transcript_excerpt: string }[];
  is_too_short: boolean;
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
}

export interface LearningPlanItem {
  category: string;
  score: number;
  recommended_scenario: string;
}

export interface LearningPlan {
  session_id: string;
  weak_competencies: LearningPlanItem[];
  all_passing: boolean;
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
    throw new Error(`Failed to create session: ${response.status}`);
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

export async function fetchEvaluation(sessionId: string): Promise<EvaluationResult> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/evaluation`);

  if (!response.ok) {
    throw new Error(`Failed to fetch evaluation: ${response.status}`);
  }

  return response.json();
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
