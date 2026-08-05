import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchCoaching, fetchEvaluation, fetchLearningPlan, fetchTranscript } from "@/lib/api/sessions";

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
