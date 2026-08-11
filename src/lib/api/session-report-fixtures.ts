import type { ReportStatus, SessionReport } from "@/lib/api/session-reports";

const summary = (sessionId = "session-1") => ({
  session_id: sessionId,
  scenario_id: "scenario-1",
  agent_id: "agent-1",
  campaign_id: "campaign-1",
  campaign_name: "Campaign",
  persona: { name: "Jordan", communication_style: "Direct", emotional_state: "Concerned" },
  status: "completed" as const,
  created_at: "2026-08-10T09:00:00Z",
  ended_at: "2026-08-10T10:00:00Z",
  duration_seconds: 3600,
  standard_id: "standard-1",
  standard_version_id: "standard-version-1",
  standard_version_number: 2,
  standard_name: "Pinned standard",
});

const transcript = {
  available: true,
  reason: null,
  reason_code: null,
  entries: [
    { speaker: "agent" as const, text: "I can help with that.", timestamp: "2026-08-10T09:01:00Z", sequence_number: 0 },
    { speaker: "debtor" as const, text: "Thank you.", timestamp: "2026-08-10T09:02:00Z", sequence_number: 1 },
  ],
};

export function canonicalReport(): SessionReport {
  return {
    session_id: "session-1", report_version: 1, status: "ready", content_hash: "a".repeat(64),
    created_at: "2026-08-10T10:00:00Z",
    payload: {
      summary: summary(), transcript,
      evaluation: {
        available: true, reason: null, reason_code: null, mode: "canonical", legacy: null,
        weighted_total: 75, passing_score: 70, passed: true, standard_version_number: 2,
        canonical: {
          status: "evaluated", summary: "Strong result", weighted_total: 75, passing_score: 70, passed: true,
          applied_techniques: { techniques_used: [], reason_if_empty: "No additional techniques recorded" },
          missed_opportunities: { missed_techniques: [], reason_if_empty: "No missed opportunities recorded" },
          categories: [{
            rubric_block_id: "opening", category: "Opening", raw_score: 80, penalty_total: 5,
            penalized_score: 75, weight: 100, weighted_contribution: 75, passing_score: 70, passed: true,
            evidence: [{ sequence_number: 0, speaker: "agent", excerpt: "I can help with that.", explanation: "Clear opening" }],
            strengths: [{ criterion_id: "greeting", explanation: "Acknowledged the caller", evidence_sequence_numbers: [0] }],
            violations: [], failed_criteria: [], recommendation_inputs: [],
          }], recommendations: [],
        },
      },
      coaching: {
        available: true, reason: null, reason_code: null, mode: "canonical", legacy_mistakes_by_category: {},
        total_mistakes: 0, no_mistakes: true,
        blocks: [{
          rubric_block_id: "opening", block_name: "Opening", display_order: 0,
          recommendations: [{
            rubric_block_id: "opening", block_name: "Opening", criterion_id: "greeting", criterion_name: "Greeting",
            display_order: 0, evidence_sequence_number: 0, source_speaker: "agent", source_excerpt: "I can help with that.",
            explanation: "Keep the greeting concise", recommended_response: "Hello", coaching_advice: "Continue this approach",
            standard_version_id: "standard-version-1", standard_version_number: 2,
          }],
        }],
      },
      learning_plan: {
        available: true, reason: null, reason_code: null, all_passing: false,
        items: [{ category: "Opening", score: 40, rubric_block_id: "opening", criterion_id: "greeting",
          practice_focus: "Practice concise greetings", scenario_id: "scenario-1", standard_version_id: "standard-version-1", standard_version_number: 2 }],
      },
    },
  };
}

export function legacyReport(): SessionReport {
  const report = canonicalReport();
  report.payload.evaluation = {
    available: true, reason: null, reason_code: "legacy_only", mode: "legacy", canonical: null,
    weighted_total: null, passing_score: null, passed: null, standard_version_number: null,
    legacy: { category_scores: [{ category: "compliance", score: 65, strengths: [], weaknesses: [] }], overall_score: 65, strengths: [], weaknesses: [] },
  };
  report.payload.coaching = { available: true, reason: null, reason_code: null, mode: "legacy", blocks: [], legacy_mistakes_by_category: {}, total_mistakes: 0, no_mistakes: true };
  report.payload.learning_plan = { available: false, reason: "No learning plan", reason_code: "artifact_missing", items: [], all_passing: null };
  return report;
}

export function cloneReport(report: SessionReport): SessionReport {
  return JSON.parse(JSON.stringify(report)) as SessionReport;
}

export function readyStatusWithFailedAttempt(): ReportStatus {
  const report = canonicalReport();
  return {
    status: "ready", session_id: report.session_id, report,
    latest_attempt: {
      status: "failed", report_version: 2,
      reason: { code: "generation_failed", message: "The latest attempt failed" },
      created_at: "2026-08-10T11:00:00Z", updated_at: "2026-08-10T11:00:01Z",
    },
  };
}
