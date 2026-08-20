import { SessionArtifactError } from "@/lib/api/sessions";
import {
  parseReportPayload as parseAggregateReport,
  type SessionReport,
} from "@/lib/api/session-reports";
import type {
  CanonicalEvaluationResult,
  CoachingReport,
  EvaluationResult,
  LearningPlan,
  LearningPlanItem,
  MistakeItem,
  RubricCoachingBlock,
} from "@/lib/api/sessions";
import type {
    FailureClass,
    NormalizedReport,
    ReportFailure,
    ReportSectionName,
    SectionEnvelope,
    SectionState,
} from "@/types/report";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const SECTION_NAMES: ReportSectionName[] = [
  "metadata", "transcript", "evaluation", "coaching", "learning_plan", "summary",
];
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isState = (value: unknown): value is SectionState =>
  value === "loading" || value === "loaded" || value === "empty" || value === "failed";

function contractFailure(message: string): ReportFailure {
  return { class: "data_contract", code: "malformed_section", safe_message: message, correlation_id: null };
}

function failedSection(name: ReportSectionName, message = "This report section is unavailable."): SectionEnvelope {
  return { name, state: "failed", data: null, unavailable_reason: null, failure: contractFailure(message), updated_at: null };
}

function normalizeSection(name: ReportSectionName, raw: unknown): SectionEnvelope {
  if (!isRecord(raw) || !isState(raw.state)) return failedSection(name);
  const state = raw.state;
  if (state === "failed") {
    const failure = isRecord(raw.failure) && isString(raw.failure.safe_message)
      ? raw.failure as unknown as ReportFailure : contractFailure("This report section is unavailable.");
    return { name, state, data: null, unavailable_reason: null, failure, updated_at: isString(raw.updated_at) ? raw.updated_at : null };
  }
  if (state === "loaded" && raw.data === undefined) return failedSection(name);
  return {
    name,
    state,
    data: state === "loaded" ? raw.data ?? null : null,
    unavailable_reason: isString(raw.unavailable_reason) ? raw.unavailable_reason : (state === "empty" ? "No data is available." : null),
    failure: null,
    updated_at: isString(raw.updated_at) ? raw.updated_at : null,
  };
}

function sectionsFromPayload(payload: Record<string, unknown>): Record<ReportSectionName, SectionEnvelope> {
  const source = payload.sections;
  const result = {} as Record<ReportSectionName, SectionEnvelope>;
  for (const name of SECTION_NAMES) {
    const raw = isRecord(source) ? source[name] : Array.isArray(source)
      ? source.find((item) => isRecord(item) && item.name === name) : undefined;
    result[name] = normalizeSection(name, raw);
  }
  return result;
}

function aggregateSection(
  name: ReportSectionName,
  available: boolean,
  data: unknown,
  reason: string | null = null,
): SectionEnvelope {
  return {
    name,
    state: available ? "loaded" : "empty",
    data: available ? data : null,
    unavailable_reason: available ? null : reason ?? "No data is available.",
    failure: null,
    updated_at: null,
  };
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function aggregateEvaluation(report: SessionReport): EvaluationResult | null {
  const { summary, transcript, evaluation } = report.payload;
  if (!evaluation.available) return null;
  const standard = {
    negotiation_standard_version_id: summary.standard_version_id,
    standard_name: summary.standard_name,
    standard_version_number: summary.standard_version_number,
  };

  if (evaluation.mode === "legacy" && isRecord(evaluation.legacy)) {
    const legacy = evaluation.legacy;
    if (!Array.isArray(legacy.category_scores)
      || !Array.isArray(legacy.strengths)
      || !Array.isArray(legacy.weaknesses)
      || typeof legacy.overall_score !== "number") return null;
    return {
      session_id: summary.session_id,
      category_scores: legacy.category_scores as EvaluationResult["category_scores"],
      overall_score: legacy.overall_score,
      strengths: legacy.strengths as EvaluationResult["strengths"],
      weaknesses: legacy.weaknesses as EvaluationResult["weaknesses"],
      is_too_short: false,
      ...standard,
      weighted_total: optionalNumber(evaluation.weighted_total) ?? legacy.overall_score,
      passing_score: optionalNumber(evaluation.passing_score),
      passed: typeof evaluation.passed === "boolean" ? evaluation.passed : null,
      rubric_result: null,
    };
  }

  const canonical = evaluation.canonical
    ? evaluation.canonical as unknown as CanonicalEvaluationResult
    : null;
  if (!canonical) return null;
  const excerptFor = (sequence: number) =>
    transcript.entries.find((entry) => entry.sequence_number === sequence)?.text
      ?? "Evidence-backed finding";
  const strengths = canonical.categories.flatMap((category) => category.strengths.map((item) => ({
    description: item.explanation,
    category: category.category,
    transcript_excerpt: excerptFor(item.evidence_sequence_numbers[0] ?? 0),
  })));
  const weaknesses = canonical.categories.flatMap((category) => category.violations.map((item) => ({
    description: item.explanation,
    category: category.category,
    transcript_excerpt: excerptFor(item.evidence_sequence_numbers[0] ?? 0),
  })));
  return {
    session_id: summary.session_id,
    category_scores: [],
    overall_score: canonical.weighted_total,
    strengths,
    weaknesses,
    is_too_short: evaluation.mode === "too_short",
    ...standard,
    weighted_total: optionalNumber(evaluation.weighted_total) ?? canonical.weighted_total,
    passing_score: optionalNumber(evaluation.passing_score) ?? canonical.passing_score,
    passed: typeof evaluation.passed === "boolean" ? evaluation.passed : canonical.passed,
    rubric_result: canonical,
  };
}

function aggregateCoaching(report: SessionReport): CoachingReport | null {
  const { summary, coaching } = report.payload;
  if (!coaching.available) return null;
  const blocks = coaching.blocks as unknown as RubricCoachingBlock[];
  const totalMistakes = optionalNumber(coaching.total_mistakes) ?? 0;
  const noMistakes = typeof coaching.no_mistakes === "boolean"
    ? coaching.no_mistakes
    : totalMistakes === 0;
  if (coaching.mode === "canonical") {
    const rubricRecommendations = blocks.flatMap((block) => block.recommendations);
    return {
      session_id: summary.session_id,
      mistakes_by_category: {},
      total_mistakes: totalMistakes || rubricRecommendations.length,
      no_mistakes: noMistakes && rubricRecommendations.length === 0,
      rubric_coaching: {
        standard_version_id: summary.standard_version_id,
        standard_version_number: summary.standard_version_number,
        blocks,
      },
      rubric_recommendations: rubricRecommendations,
      rubric_recommendations_by_block: Object.fromEntries(
        blocks.map((block) => [block.rubric_block_id, block.recommendations]),
      ),
    };
  }
  return {
    session_id: summary.session_id,
    mistakes_by_category: coaching.legacy_mistakes_by_category as unknown as Record<string, MistakeItem[]>,
    total_mistakes: totalMistakes,
    no_mistakes: noMistakes,
  };
}

function aggregateLearningPlan(report: SessionReport): LearningPlan | null {
  const { summary, learning_plan } = report.payload;
  if (!learning_plan.available) return null;
  return {
    session_id: summary.session_id,
    weak_competencies: learning_plan.items as unknown as LearningPlanItem[],
    all_passing: typeof learning_plan.all_passing === "boolean"
      ? learning_plan.all_passing
      : learning_plan.items.length === 0,
  };
}

function normalizedAggregateReport(report: SessionReport): NormalizedReport {
  const { summary, transcript, evaluation } = report.payload;
  const evaluationData = aggregateEvaluation(report);
  const coachingData = aggregateCoaching(report);
  const learningPlanData = aggregateLearningPlan(report);
  const terminal = evaluation.mode === "not_applicable" || evaluation.mode === "too_short";
  const allAvailable = evaluation.available && report.payload.coaching.available && report.payload.learning_plan.available;
  const session = {
    id: summary.session_id,
    scenario_id: summary.scenario_id,
    status: summary.status,
    created_at: summary.created_at,
    ended_at: summary.ended_at,
  };
  const sections: Record<ReportSectionName, SectionEnvelope> = {
    metadata: aggregateSection("metadata", true, session),
    summary: aggregateSection("summary", true, summary),
    transcript: aggregateSection("transcript", transcript.available, transcript.entries, transcript.reason ?? null),
    evaluation: aggregateSection("evaluation", evaluationData !== null, evaluationData, evaluation.reason ?? null),
    coaching: aggregateSection("coaching", coachingData !== null, coachingData, report.payload.coaching.reason ?? null),
    learning_plan: aggregateSection("learning_plan", learningPlanData !== null, learningPlanData, report.payload.learning_plan.reason ?? null),
  };
  return {
    session_id: summary.session_id,
    session,
    report_status: terminal ? "not_applicable" : allAvailable ? "complete" : "partial",
    score_status: terminal ? "not_applicable" : evaluationData ? "evaluated" : "unavailable",
    evaluation_version: {
      id: summary.standard_version_id,
      number: summary.standard_version_number,
      name: summary.standard_name,
      kind: evaluation.mode === "legacy" ? "legacy" : "current",
    },
    evaluation_kind: evaluation.mode === "legacy" ? "legacy" : "current",
    sections,
    correlation_id: null,
  };
}

export function parseReportPayload(payload: unknown, expectedSessionId?: string): NormalizedReport {
  if (isRecord(payload) && isRecord(payload.payload)) {
    return normalizedAggregateReport(parseAggregateReport(payload, expectedSessionId));
  }
  if (!isRecord(payload)) {
    throw new Error("Report response is invalid.");
  }
  const session = isRecord(payload.session) ? payload.session : null;
  const sessionId = isString(payload.session_id)
    ? payload.session_id
    : session && isString(session.id) ? session.id : null;
  if (!sessionId || (expectedSessionId !== undefined && sessionId !== expectedSessionId)) {
    throw new Error("Report response is invalid.");
  }
  const sections = sectionsFromPayload(payload);
  const evaluation = sections.evaluation.data;
  const legacy = isRecord(evaluation) && evaluation.rubric_result == null;
  const tooShort = isRecord(evaluation) && evaluation.is_too_short === true;
  const version = isRecord(payload.evaluation_version) ? payload.evaluation_version : {};
  const kind = version.kind === "current" ? "current" : "legacy";
  const reportStatus = payload.report_status === "complete" || payload.report_status === "partial"
    || payload.report_status === "failed" || payload.report_status === "not_applicable"
    ? payload.report_status : tooShort ? "not_applicable" : "partial";
  const scoreStatus = payload.score_status === "evaluated" || payload.score_status === "not_applicable"
    || payload.score_status === "unavailable" || payload.score_status === "failed"
    ? payload.score_status : tooShort ? "not_applicable" : "unavailable";
  return {
    session_id: sessionId,
    session,
    report_status: reportStatus,
    score_status: scoreStatus,
    evaluation_version: {
      id: isString(version.id) ? version.id : null,
      number: typeof version.number === "number" ? version.number : null,
      name: isString(version.name) ? version.name : null,
      kind,
    },
    evaluation_kind: legacy ? "legacy" : kind,
    sections,
    correlation_id: isString(payload.correlation_id) ? payload.correlation_id : null,
  };
}

export async function fetchReport(sessionId: string): Promise<NormalizedReport> {
  const token = typeof window !== "undefined" ? window.localStorage?.getItem("cat_token") : null;
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/report`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      const category = response.status === 401 ? "unauthorized"
        : response.status === 403 ? "forbidden"
          : response.status === 404 ? "not_found"
            : response.status >= 500 ? "server" : "request";
      throw new SessionArtifactError(
        category,
        category === "unauthorized" ? "Sign in again to view this report."
          : category === "forbidden" ? "You do not have access to this report."
            : category === "not_found" ? "This report is not available."
              : category === "server" ? "Unable to load the report right now. Please try again."
                : "Unable to load the report. Please try again.",
        { status: response.status, retryable: category === "server" },
      );
    }
    return parseReportPayload(await response.json(), sessionId);
  } catch (error) {
    if (error instanceof SessionArtifactError) throw error;
    if (error instanceof TypeError) {
      throw new SessionArtifactError("network", "Unable to load the report right now. Please try again.", { retryable: true });
    }
    throw new SessionArtifactError("validation", "Report response is invalid. Please try again.");
  }
}

export { SECTION_NAMES };
export type { FailureClass };

export async function downloadReportCsv(sessionId: string): Promise<Blob> {
  const token = typeof window !== "undefined" ? window.localStorage?.getItem("cat_token") : null;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/report/export?format=csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    throw new SessionArtifactError("network", "Unable to export the report. Please try again.", { retryable: true });
  }
  if (!response.ok) {
    const category = response.status === 403 ? "forbidden" : "request";
    throw new SessionArtifactError(
      category,
      response.status === 403
        ? "You do not have permission to export this report."
        : "Unable to export the report. Please try again.",
      { status: response.status, retryable: response.status >= 500 },
    );
  }
  return response.blob();
}
