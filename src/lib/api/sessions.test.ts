import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchCoaching,
  fetchEvaluation,
  fetchLearningPlan,
  fetchTranscript,
  SessionArtifactError,
} from "@/lib/api/sessions";

const response = (payload: unknown) => ({ ok: true, json: async () => payload });

const validEvaluation = {
  session_id: "session-1",
  category_scores: [],
  overall_score: 70,
  strengths: [],
  weaknesses: [],
  is_too_short: false,
  rubric_result: null,
};

const validCoaching = {
  session_id: "session-1",
  mistakes_by_category: {},
  total_mistakes: 0,
  no_mistakes: true,
};

const validPlan = {
  session_id: "session-1",
  weak_competencies: [],
  all_passing: true,
};

afterEach(() => vi.unstubAllGlobals());

describe("session result runtime contracts", () => {
  it("rejects malformed transcript entries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ sequence_number: "1" }])));

    await expect(fetchTranscript("session-1")).rejects.toThrow(/transcript response/i);
  });

  it("rejects malformed coaching payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ...validCoaching, no_mistakes: "yes" })));

    await expect(fetchCoaching("session-1")).rejects.toThrow(/coaching response/i);
  });

  it("rejects malformed learning-plan payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ...validPlan, weak_competencies: [{ category: "x" }] })));

    await expect(fetchLearningPlan("session-1")).rejects.toThrow(/learning plan response/i);
  });

  it("rejects malformed canonical evaluation payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      ...validEvaluation,
      rubric_result: { status: "evaluated", categories: "invalid" },
    })));

    await expect(fetchEvaluation("session-1")).rejects.toThrow(/evaluation response/i);
  });
});


describe("criteria-based coaching completion bug-condition exploration", () => {
  const endpoints = [
    ["transcript", fetchTranscript],
    ["evaluation", fetchEvaluation],
    ["coaching", fetchCoaching],
    ["learning plan", fetchLearningPlan],
  ] as const;

  it.each(endpoints)("sends the stored bearer token for %s", async (_, fetchArtifact) => {
    window.localStorage.setItem("cat_token", "exploration-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(
      fetchArtifact === fetchTranscript ? [] : fetchArtifact === fetchEvaluation ? validEvaluation : fetchArtifact === fetchCoaching ? validCoaching : validPlan,
    )));

    await fetchArtifact("session-1");

    const request = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit | undefined;
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer exploration-token");
    expect(request?.method ?? "GET").toBe("GET");
  });

  it("is safe when browser globals are unavailable during SSR", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("localStorage", undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));

    await expect(fetchTranscript("session-1")).resolves.toEqual([]);
    const request = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit | undefined;
    expect(request?.method).toBe("GET");
    expect(new Headers(request?.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(request?.headers).get("Authorization")).toBeNull();
  });

  it("maps 401, 403, and 404 for every protected artifact without response details", async () => {
    const statuses = [
      [401, "Sign in again to view this result"],
      [403, "You do not have access to this session"],
      [404, "This artifact is not available"],
    ] as const;
    const secret = "database stack trace, campaign owner, transcript secret";

    for (const [name, fetchArtifact] of endpoints) {
      for (const [status, safeMessage] of statuses) {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
          ok: false,
          status,
          json: async () => ({ detail: secret }),
        }));

        const error = await fetchArtifact("session-1").catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(Error);
        if (!(error instanceof Error)) throw new Error("Expected a safe artifact error");
        expect(error.message).toContain(safeMessage);
        expect(error.message).not.toContain(secret);
        expect(name).toBeTruthy();
      }
    }
  });

  it("classifies only network, decode, and 5xx failures as retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network details")));
    const networkError = await fetchTranscript("session-1").catch((caught: unknown) => caught);
    expect(networkError).toBeInstanceOf(SessionArtifactError);
    expect(networkError).toMatchObject({ category: "network", retryable: true });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new Error("malformed response"); },
    }));
    const decodeError = await fetchTranscript("session-1").catch((caught: unknown) => caught);
    expect(decodeError).toMatchObject({ category: "decode", retryable: true });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ detail: "secret" }) }));
    const serverError = await fetchEvaluation("session-1").catch((caught: unknown) => caught);
    expect(serverError).toMatchObject({ category: "server", status: 503, retryable: true });

    for (const status of [401, 403, 404]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ detail: "secret" }) }));
      const terminalError = await fetchCoaching("session-1").catch((caught: unknown) => caught);
      expect(terminalError).toBeInstanceOf(SessionArtifactError);
      expect(terminalError).toMatchObject({ status, retryable: false });
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ sequence_number: "invalid" })));
    const validationError = await fetchTranscript("session-1").catch((caught: unknown) => caught);
    expect(validationError).toMatchObject({ category: "validation", retryable: false });
  });

  it.each([
    ["applied techniques", { applied_techniques: null }],
    ["missed techniques", { missed_opportunities: { missed_techniques: "wrong", reason_if_empty: "none" } }],
    ["nested evidence references", {
      categories: [{
        rubric_block_id: "custom", category: "Custom", raw_score: 50, penalty_total: 0,
        penalized_score: 50, weight: 100, weighted_contribution: 50, passing_score: 70,
        passed: false, evidence: [], strengths: [{ criterion_id: "criterion", explanation: "x", evidence_sequence_numbers: ["bad"] }],
        violations: [], failed_criteria: [], recommendation_inputs: [],
      }],
    }],
  ])("rejects malformed canonical %s before rendering", async (_, mutation) => {
    const canonical = {
      status: "evaluated", summary: "summary", categories: [], weighted_total: 50,
      passing_score: 70, passed: false,
      applied_techniques: { techniques_used: [], reason_if_empty: "none" },
      missed_opportunities: { missed_techniques: [], reason_if_empty: "none" }, recommendations: [],
      ...mutation,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ...validEvaluation, rubric_result: canonical })));

    await expect(fetchEvaluation("session-1")).rejects.toThrow(/evaluation response/i);
  });

  it("rejects malformed grouped canonical coaching identity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      ...validCoaching,
      rubric_coaching: {
        blocks: [{
          rubric_block_id: "block-a", block_name: "Block A", display_order: 0,
          recommendations: [{
            rubric_block_id: "block-b", criterion_id: "criterion", evidence_sequence_number: 0,
            explanation: "x", recommended_response: "y", coaching_advice: "z",
          }],
        }],
      },
    })));

    await expect(fetchCoaching("session-1")).rejects.toThrow(/coaching response/i);
  });

  it("rejects an empty or unresolved learning-plan scenario reference", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      ...validPlan,
      all_passing: false,
      weak_competencies: [{ category: "Custom", score: 40, scenario_id: "", practice_focus: "Review this criterion" }],
    })));

    await expect(fetchLearningPlan("session-1")).rejects.toThrow(/learning plan response/i);
  });

  it("rejects transcript entries with invalid timestamp or duplicate sequence identity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([
      { speaker: "agent", text: "one", timestamp: "not-a-timestamp", sequence_number: 0 },
      { speaker: "debtor", text: "two", timestamp: "2026-01-01T00:00:00Z", sequence_number: 0 },
    ])));

    await expect(fetchTranscript("session-1")).rejects.toThrow(/transcript response/i);
  });

  it("preserves custom canonical category and evidence/recommendation order", async () => {
    const first = {
      rubric_block_id: "custom", category: "Custom Category", raw_score: 80, penalty_total: 0,
      penalized_score: 80, weight: 100, weighted_contribution: 80, passing_score: 70, passed: true,
      evidence: [{ sequence_number: 2, speaker: "agent", excerpt: "second", explanation: "second" }],
      strengths: [], violations: [], failed_criteria: [], recommendation_inputs: [],
    };
    const second = { ...first, rubric_block_id: "custom-two", category: "Other Custom Category", evidence: [{ sequence_number: 1, speaker: "debtor", excerpt: "first", explanation: "first" }] };
    const payload = {
      ...validEvaluation,
      rubric_result: {
        status: "evaluated", summary: "summary", categories: [first, second], weighted_total: 80,
        passing_score: 70, passed: true,
        applied_techniques: { techniques_used: [], reason_if_empty: "none" },
        missed_opportunities: { missed_techniques: [], reason_if_empty: "none" },
        recommendations: [],
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(payload)));

    const result = await fetchEvaluation("session-1");
    expect(result.rubric_result?.categories.map((category) => category.category)).toEqual(["Custom Category", "Other Custom Category"]);
    expect(result.rubric_result?.categories.map((category) => category.evidence[0].sequence_number)).toEqual([2, 1]);
  });

  it("preserves successful legacy artifact schemas and empty transcript output", async () => {
    const legacyEvaluation = {
      ...validEvaluation,
      overall_score: 73.5,
      category_scores: [{ category: "compliance", score: 73.5, strengths: [], weaknesses: [] }],
      standard_name: "Pinned Standard",
      standard_version_number: 9,
    };
    const legacyCoaching = {
      session_id: "session-1",
      mistakes_by_category: { compliance: [{ transcript_position: 2, transcript_excerpt: "No plan", category: "compliance", explanation: "Missing plan", recommended_alternative: "Offer a plan" }] },
      total_mistakes: 1,
      no_mistakes: false,
    };
    const plan = {
      ...validPlan,
      all_passing: false,
      weak_competencies: [{ category: "Custom Category", score: 55, rubric_block_id: "custom-block", criterion_id: "offer-plan", practice_focus: "Practice offering a plan.", scenario_id: "scenario-1" }],
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response(legacyEvaluation))
      .mockResolvedValueOnce(response(legacyCoaching))
      .mockResolvedValueOnce(response(plan)));

    await expect(fetchTranscript("session-1")).resolves.toEqual([]);
    await expect(fetchEvaluation("session-1")).resolves.toEqual(legacyEvaluation);
    await expect(fetchCoaching("session-1")).resolves.toEqual(legacyCoaching);
    await expect(fetchLearningPlan("session-1")).resolves.toEqual(plan);
  });
});
