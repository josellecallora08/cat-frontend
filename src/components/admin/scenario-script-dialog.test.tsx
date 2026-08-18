import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";
import { ScenarioScriptDialog } from "./scenario-script-dialog";
import { fetchScripts } from "@/lib/api/scripts";

vi.mock("@/lib/api/scripts", () => ({
  fetchScripts: vi.fn(),
  publishScript: vi.fn(),
  unpublishScript: vi.fn(),
  deleteScript: vi.fn(),
}));

describe("ScenarioScriptDialog", () => {
  beforeEach(() => {
    vi.mocked(fetchScripts).mockReset();
    useAuthStore.setState({
      user: {
        id: "admin-1",
        email: "admin@example.com",
        full_name: "Admin User",
        role: "admin",
        user_type: null,
        is_active: true,
      },
      token: "test-admin-token-marker",
    });
  });

  it("shows Manage script when the scenario already has a script", async () => {
    vi.mocked(fetchScripts).mockResolvedValue([{
      id: "script-1",
      name: "Dispute behavior",
      scenario_id: "scenario-1",
      status: "published",
      format: "json",
      created_at: "2026-07-29T00:00:00Z",
      updated_at: "2026-07-29T00:00:00Z",
    }]);

    render(<ScenarioScriptDialog scenarioId="scenario-1" scenarioName="Disputed Charges" />);

    expect(await screen.findByRole("button", { name: /manage script/i })).toBeInTheDocument();
  });

  it("renders nothing for a normal user", () => {
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "agent@example.com",
        full_name: "Agent User",
        role: "user",
        user_type: "agent",
        is_active: true,
      },
    });
    render(<ScenarioScriptDialog scenarioId="scenario-1" scenarioName="Disputed Charges" />);
    expect(screen.queryByRole("button", { name: /script/i })).not.toBeInTheDocument();
  });
});
