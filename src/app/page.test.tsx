import { server } from "@/test/mocks/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock recharts to avoid rendering issues in jsdom
vi.mock("recharts", () => ({
  AreaChart: () => null,
  Area: () => null,
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  Legend: () => null,
  RadarChart: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  Radar: () => null,
  Cell: () => null,
}));

const mockDashboardData = {
  total_sessions: 12,
  completed_sessions: 8,
  active_sessions: 2,
  total_scenarios: 5,
  average_overall_score: 72,
  category_averages: [
    { category: "Call Opening", average_score: 80 },
    { category: "Compliance", average_score: 75 },
  ],
  recent_sessions: [
    {
      id: "session-1",
      scenario_name: "Financial Hardship",
      persona_name: "Maria Santos",
      status: "completed",
      overall_score: 85,
      created_at: "2024-01-15T10:30:00Z",
    },
  ],
  total_conversations: 45,
  improvement_trend: 5,
};

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("DashboardPage", () => {
  it("shows loading skeletons initially", () => {
    server.use(
      http.get("/api/dashboard", async () => {
        await new Promise(() => {/* never resolves */});
        return HttpResponse.json({});
      })
    );

    renderWithProviders(<DashboardPage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders dashboard with KPI stats on successful fetch", async () => {
    server.use(
      http.get("/api/dashboard", () => {
        return HttpResponse.json(mockDashboardData);
      }),
      http.get("/api/dashboard/score-history", () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("shows error state when dashboard fetch fails", async () => {
    server.use(
      http.get("/api/dashboard", () => {
        return HttpResponse.json(null, { status: 500 });
      }),
      http.get("/api/dashboard/score-history", () => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load dashboard/i)).toBeInTheDocument();
    });
  });

  it("renders recent sessions list", async () => {
    server.use(
      http.get("/api/dashboard", () => {
        return HttpResponse.json(mockDashboardData);
      }),
      http.get("/api/dashboard/score-history", () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Financial Hardship")).toBeInTheDocument();
    });

    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("shows empty recent sessions message when none available", async () => {
    server.use(
      http.get("/api/dashboard", () => {
        return HttpResponse.json({
          ...mockDashboardData,
          recent_sessions: [],
        });
      }),
      http.get("/api/dashboard/score-history", () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/no sessions yet/i)
      ).toBeInTheDocument();
    });
  });

  it("has a link to start training", async () => {
    server.use(
      http.get("/api/dashboard", () => {
        return HttpResponse.json(mockDashboardData);
      }),
      http.get("/api/dashboard/score-history", () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Start Training")).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /start training/i });
    expect(link).toHaveAttribute("href", "/scenarios");
  });
});
