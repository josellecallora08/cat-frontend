import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CampaignList } from "@/components/campaigns/campaign-list";
import { CampaignScenarioList } from "@/components/campaigns/campaign-scenario-list";

const campaigns = [
  {
    id: "completed",
    name: "Zulu Campaign",
    description: "done",
    total_scenarios: 2,
    accomplished_scenarios: 2,
    is_completed: true,
  },
  {
    id: "active",
    name: "Alpha Campaign",
    description: "a".repeat(121),
    total_scenarios: 4,
    accomplished_scenarios: 1,
    is_completed: false,
  },
];

const scenarios = [
  { scenario_id: "2", scenario_name: "alpha", scenario_type: "phone_call", accomplished: true },
  { scenario_id: "1", scenario_name: "Alpha", scenario_type: "email_follow_up", accomplished: false },
  { scenario_id: "3", scenario_name: "Bravo", scenario_type: "chat", accomplished: false },
];

describe("CampaignList", () => {
  it("renders progress, truncates descriptions, and marks completed campaigns", () => {
    render(<CampaignList campaigns={campaigns} onSelectCampaign={vi.fn()} />);

    expect(screen.getByText("1/4 scenarios completed")).toBeInTheDocument();
    expect(screen.getByText("2/2 scenarios completed")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText(`${"a".repeat(120)}…`)).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(<CampaignList campaigns={[]} onSelectCampaign={vi.fn()} />);
    expect(screen.getByText("No active campaigns")).toBeInTheDocument();
  });
});

describe("CampaignScenarioList", () => {
  it("sorts scenarios, renders accomplished styling, and sends both IDs", () => {
    const onSelect = vi.fn();
    render(
      <CampaignScenarioList
        campaignId="campaign-1"
        scenarios={scenarios}
        isCompleted
        onScenarioSelect={onSelect}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => within(item).getByText(/alpha|bravo/i).textContent)).toEqual([
      "Alpha",
      "alpha",
      "Bravo",
    ]);
    expect(screen.getByText("Campaign completed")).toBeInTheDocument();
    expect(items[0]).not.toHaveClass("opacity-70");
    expect(items[1].firstElementChild).toHaveClass("opacity-70");

    fireEvent.click(screen.getByRole("button", { name: /re-practice alpha/i }));
    expect(onSelect).toHaveBeenCalledWith({ scenario_id: "2", campaign_id: "campaign-1" });
  });

  it("renders the empty scenario state", () => {
    render(
      <CampaignScenarioList
        campaignId="campaign-1"
        scenarios={[]}
        onScenarioSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("No scenarios available")).toBeInTheDocument();
  });
});

const {
  mockUseAgentCampaigns,
  mockUseCampaignProgress,
  mockSelectCampaign,
  mockClearSelection,
  mockCreateSession,
  selectionState,
} = vi.hoisted(() => ({
  mockUseAgentCampaigns: vi.fn(),
  mockUseCampaignProgress: vi.fn(),
  mockSelectCampaign: vi.fn(),
  mockClearSelection: vi.fn(),
  mockCreateSession: vi.fn(),
  selectionState: { selectedCampaignId: null as string | null },
}));

vi.mock("@/hooks/use-agent-campaigns", () => ({ useAgentCampaigns: mockUseAgentCampaigns }));
vi.mock("@/hooks/use-campaign-progress", () => ({ useCampaignProgress: mockUseCampaignProgress }));
vi.mock("@/stores/campaign-selection-store", () => ({
  useCampaignSelectionStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ selectedCampaignId: selectionState.selectedCampaignId, selectCampaign: mockSelectCampaign, clearSelection: mockClearSelection }),
}));
vi.mock("@/stores/session-store", () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ createSession: mockCreateSession }),
}));

import CampaignsPage from "@/app/(app)/campaigns/page";

describe("CampaignsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectionState.selectedCampaignId = null;
    mockUseAgentCampaigns.mockReturnValue({ data: campaigns, isLoading: false, isError: false, refetch: vi.fn() });
    mockUseCampaignProgress.mockReturnValue({ isLoading: false, isError: false, data: { scenarios, is_completed: false }, refetch: vi.fn() });
  });

  it("auto-selects a single campaign and forwards campaign_id when starting", () => {
    const singleCampaign = [campaigns[1]];
    mockUseAgentCampaigns.mockReturnValue({ data: singleCampaign, isLoading: false, isError: false, refetch: vi.fn() });
    mockUseCampaignProgress.mockReturnValue({ isLoading: false, isError: false, data: { scenarios, is_completed: false }, refetch: vi.fn() });

    render(<CampaignsPage />);
    expect(mockSelectCampaign).toHaveBeenCalledWith("active");
  });

  it("forwards campaign_id when starting a scenario", () => {
    selectionState.selectedCampaignId = "active";
    render(<CampaignsPage />);

    fireEvent.click(screen.getByRole("button", { name: /start alpha/i }));
    expect(mockCreateSession).toHaveBeenCalledWith("1", "active");
  });

  it("shows loading and error states", () => {
    mockUseAgentCampaigns.mockReturnValue({ data: [], isLoading: true, isError: false, refetch: vi.fn() });
    const { rerender } = render(<CampaignsPage />);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);

    mockUseAgentCampaigns.mockReturnValue({ data: [], isLoading: false, isError: true, refetch: vi.fn() });
    rerender(<CampaignsPage />);
    expect(screen.getByText(/couldn’t load campaigns/i)).toBeInTheDocument();
  });
});
