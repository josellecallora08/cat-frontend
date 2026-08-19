import { describe, expect, it } from "vitest";

import { describeStandardReadiness } from "./page";
import type { StandardResponse } from "@/lib/api/negotiation-standards";

describe("describeStandardReadiness", () => {
  it("returns a 'Not started' readiness sentence when there is no standard yet", () => {
    expect(describeStandardReadiness(null, false)).toBe("Not started — no standard yet");
  });

  it("returns a loading sentence while the standard is still loading", () => {
    expect(describeStandardReadiness(null, true)).toBe("Loading standard…");
  });

  it("returns an 'In progress' readiness sentence with the draft weight percentage", () => {
    const draft: StandardResponse = {
      id: "standard-1",
      campaign_id: "campaign-1",
      name: "Collections standard",
      description: null,
      status: "draft",
      revision: 1,
      current_version_id: null,
      current_version_number: null,
      draft_content: {
        schema_version: 1,
        overall_passing_score: 70,
        blocks: [
          { id: "a", category: "Opening", weight: 25, passing_score: 70, scoring_instructions: "", positive_behaviors: [], violations: [], penalties: [], recommendation_guidance: "", display_order: 0 },
          { id: "b", category: "Closing", weight: 15, passing_score: 70, scoring_instructions: "", positive_behaviors: [], violations: [], penalties: [], recommendation_guidance: "", display_order: 1 },
        ],
      },
    };
    expect(describeStandardReadiness(draft, false)).toBe("In progress — 40% of 100% weight assigned");
  });

  it("returns a 'Ready' readiness sentence when the standard is published", () => {
    const published: StandardResponse = {
      id: "standard-1",
      campaign_id: "campaign-1",
      name: "Collections standard",
      description: null,
      status: "published",
      revision: 2,
      current_version_id: "version-1",
      current_version_number: 3,
      draft_content: null,
    };
    expect(describeStandardReadiness(published, false)).toBe("Ready — sessions can start");
  });
});
