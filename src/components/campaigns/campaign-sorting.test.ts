import { describe, expect, it } from "vitest";

import { truncateDescription } from "@/components/campaigns/campaign-list";
import { sortScenarios } from "@/components/campaigns/campaign-scenario-list";
import type { ScenarioProgressItem } from "@/types/campaign-selection";

function scenario(scenario_id: string, scenario_name: string): ScenarioProgressItem {
  return {
    scenario_id,
    scenario_name,
    scenario_type: "standard",
    accomplished: false,
  };
}

function generatedScenarios(): ScenarioProgressItem[] {
  return Array.from({ length: 100 }, (_, index) => {
    const name = [`Alpha ${index % 5}`, `beta ${index % 7}`, `ALPHA ${index % 5}`][index % 3];
    return scenario(String(100 - index).padStart(3, "0"), name);
  });
}

describe("campaign sorting and description helpers", () => {
  it("sorts every generated scenario list case-insensitively with ID tie-breaking", () => {
    const sorted = sortScenarios(generatedScenarios());

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const nameOrder = previous.scenario_name.localeCompare(current.scenario_name, undefined, {
        sensitivity: "base",
      });

      expect(nameOrder < 0 || (nameOrder === 0 && previous.scenario_id <= current.scenario_id)).toBe(
        true,
      );
    }
  });

  it("preserves descriptions through 120 characters and truncates longer descriptions", () => {
    for (let length = 0; length <= 240; length += 1) {
      const description = "x".repeat(length);
      const result = truncateDescription(description);

      if (length <= 120) {
        expect(result).toBe(description || "No description provided.");
      } else {
        expect(result).toBe(`${description.slice(0, 120)}…`);
        expect(result).toHaveLength(121);
      }
    }
  });
});
