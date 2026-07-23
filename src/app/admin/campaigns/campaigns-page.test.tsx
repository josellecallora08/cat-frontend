import { server } from "@/test/mocks/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AdminCampaignsPage from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/campaigns",
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock auth store
vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      user: {
        id: "admin-1",
        email: "admin@test.com",
        full_name: "Admin",
        role: "admin",
        is_active: true,
      },
      token: "test-token",
    };
    return selector(state);
  },
}));

// Mock gsap (used by FilterTabs)
vi.mock("gsap", () => ({
  default: {
    to: vi.fn(),
    set: vi.fn(),
    fromTo: vi.fn(),
  },
}));

// --- Mock data ---
const mockCampaigns = {
  items: [
    {
      id: "campaign-1",
      name: "Q1 Training",
      status: "active",
      scenarios_count: 3,
      agents_count: 5,
      start_date: "2025-01-01",
      end_date: "2025-03-31",
      created_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "campaign-2",
      name: "Onboarding",
      status: "draft",
      scenarios_count: 2,
      agents_count: 3,
      start_date: "2025-02-01",
      end_date: "2025-04-30",
      created_at: "2025-01-15T00:00:00Z",
    },
  ],
  total: 2,
  page: 1,
  page_size: 10,
  total_pages: 1,
};

const mockScenarios = [
  {
    id: "scenario-1",
    name: "Financial Hardship",
    scenario_type: "FINANCIAL_HARDSHIP",
    description: "Practice handling a debtor experiencing financial difficulties.",
  },
];

const mockAgents = [
  {
    id: "agent-1",
    full_name: "Agent Smith",
    email: "agent@test.com",
    role: "agent",
    is_active: true,
  },
];

// --- MSW Handlers ---
const campaignHandlers = [
  http.get("*/api/campaigns", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    if (status) {
      const filtered = mockCampaigns.items.filter((c) => c.status === status);
      return HttpResponse.json({
        ...mockCampaigns,
        items: filtered,
        total: filtered.length,
      });
    }
    return HttpResponse.json(mockCampaigns);
  }),
  http.get("*/api/scenarios", () => {
    return HttpResponse.json(mockScenarios);
  }),
  http.get("*/api/auth/users", () => {
    return HttpResponse.json(mockAgents);
  }),
  http.post("*/api/campaigns", () => {
    return HttpResponse.json(
      {
        id: "campaign-new",
        name: "New Campaign",
        description: null,
        status: "draft",
        start_date: "2025-06-01",
        end_date: "2025-07-01",
        scenarios: [],
        agents: [],
        created_at: "2025-06-01T00:00:00Z",
        updated_at: "2025-06-01T00:00:00Z",
      },
      { status: 201 }
    );
  }),
  http.delete("*/api/campaigns/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("AdminCampaignsPage", () => {
  beforeEach(() => {
    server.use(...campaignHandlers);
  });

  it("shows loading state initially", () => {
    renderWithProviders(<AdminCampaignsPage />);
    // The loading state renders a Loader2 spinner
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders campaign list after data loads", async () => {
    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("Q1 Training")).toBeInTheDocument();
    });

    expect(screen.getByText("Onboarding")).toBeInTheDocument();
  });

  it("shows empty state when no campaigns exist", async () => {
    server.use(
      http.get("*/api/campaigns", () => {
        return HttpResponse.json({
          items: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
        });
      })
    );

    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("No campaigns yet")).toBeInTheDocument();
    });
  });

  it("shows error on API failure", async () => {
    server.use(
      http.get("*/api/campaigns", () => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load campaigns.")).toBeInTheDocument();
    });
  });

  it("displays KPI cards with correct values", async () => {
    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("Q1 Training")).toBeInTheDocument();
    });

    // Total Campaigns KPI card
    const totalLabel = screen.getByText("Total Campaigns");
    const totalCard = totalLabel.closest("[data-slot='card-content']")!;
    expect(within(totalCard as HTMLElement).getByText("2")).toBeInTheDocument();

    // Active Campaigns KPI card (only campaign-1 is active)
    const activeLabel = screen.getByText("Active Campaigns");
    const activeCard = activeLabel.closest("[data-slot='card-content']")!;
    expect(within(activeCard as HTMLElement).getByText("1")).toBeInTheDocument();

    // Agents Enrolled KPI card (5 + 3 = 8)
    const agentsLabel = screen.getByText("Agents Enrolled");
    const agentsCard = agentsLabel.closest("[data-slot='card-content']")!;
    expect(within(agentsCard as HTMLElement).getByText("8")).toBeInTheDocument();
  });

  it("opens create dialog when Create Campaign button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("Q1 Training")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create campaign/i }));

    await waitFor(() => {
      expect(screen.getByText("Create Campaign", { selector: "[class*='text-lg']" })).toBeInTheDocument();
    });
  });

  it("validates required fields in create form", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("Q1 Training")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create campaign/i }));

    await waitFor(() => {
      expect(screen.getByText("Fill in the details to create a new campaign.")).toBeInTheDocument();
    });

    // Click create without filling anything
    await user.click(screen.getByRole("button", { name: /^Create$/i }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });

    expect(screen.getByText("Select at least one agent")).toBeInTheDocument();
  });

  it("opens delete confirmation dialog", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("Q1 Training")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /delete q1 training/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/are you sure you want to delete this campaign/i)
      ).toBeInTheDocument();
    });
  });

  it("filter tabs are rendered", async () => {
    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("Q1 Training")).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Draft" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Completed" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Archived" })).toBeInTheDocument();
  });

  it("form inputs have associated labels", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("Q1 Training")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /create campaign/i }));

    await waitFor(() => {
      expect(screen.getByText("Fill in the details to create a new campaign.")).toBeInTheDocument();
    });

    // Check that form labels are present in the dialog
    // The dialog renders in a portal, so we scope to the dialog popup
    const dialog = document.querySelector("[role='dialog']")!;
    const dialogEl = dialog as HTMLElement;
    expect(within(dialogEl).getByText("Name")).toBeInTheDocument();
    expect(within(dialogEl).getByText("Description")).toBeInTheDocument();
    expect(within(dialogEl).getByText("Status")).toBeInTheDocument();
    expect(within(dialogEl).getByText("Agents")).toBeInTheDocument();
  });

  it("action buttons have aria-labels", async () => {
    renderWithProviders(<AdminCampaignsPage />);

    await waitFor(() => {
      expect(screen.getByText("Q1 Training")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /edit q1 training/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete q1 training/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit onboarding/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete onboarding/i })).toBeInTheDocument();
  });
});
