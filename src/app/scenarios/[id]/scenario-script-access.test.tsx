import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";
import ScenarioDetailPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/hooks/use-scenarios", () => ({
  useScenario: () => ({
    data: {
      id: "scenario-1",
      name: "Disputed Charges",
      scenario_type: "ANGRY_CUSTOMER",
      description: "Practice de-escalation.",
      debtor_profile: {
        name: "Roberto",
        outstanding_balance: 28500,
        days_past_due: 45,
        personality_profile: "Angry",
        conversation_goal: "Dispute the debt",
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

describe("scenario script administration access", () => {
  beforeEach(() => {
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

  it("shows an upload script action to administrators", async () => {
    await act(async () => {
      render(<ScenarioDetailPage params={Promise.resolve({ id: "scenario-1" })} />);
    });
    expect(await screen.findByRole("button", { name: /upload script/i })).toBeInTheDocument();
  });

  it("does not show script administration to normal users", async () => {
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
    await act(async () => {
      render(<ScenarioDetailPage params={Promise.resolve({ id: "scenario-1" })} />);
    });
    expect(await screen.findByRole("button", { name: /start call/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload script/i })).not.toBeInTheDocument();
  });
});
