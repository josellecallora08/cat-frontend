import { SessionArtifactError } from "@/lib/api/sessions";
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

export function parseReportPayload(payload: unknown, expectedSessionId?: string): NormalizedReport {
  if (!isRecord(payload) || !isString(payload.session_id)
    || (expectedSessionId !== undefined && payload.session_id !== expectedSessionId)) {
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
    session_id: payload.session_id,
    session: isRecord(payload.session) ? payload.session : null,
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
    response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/report.csv`, {
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
