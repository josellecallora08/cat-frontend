import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/mocks/server";
import { useAuthStore } from "@/stores/auth-store";
import AdminAgentsPage from "./page";

const AUTH_TOKEN = "test-admin-token-marker";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AdminAgentsPage /></QueryClientProvider>);
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: "admin-1",
      email: "admin@example.com",
      full_name: "Admin User",
      role: "admin",
      user_type: null,
      is_active: true,
      avatar_url: null,
    },
    token: AUTH_TOKEN,
  });
});

describe("AdminAgentsPage charts", () => {
  it("renders score history and comparison data while preserving table controls", async () => {
    server.use(
      http.get("*/api/dashboard/agents", () => HttpResponse.json([{ id: "agent-1", full_name: "Agent One", email: "one@test.com" }])),
      http.get("*/api/dashboard/sessions", () => HttpResponse.json({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 })),
      http.get("*/api/dashboard/score-history", () => HttpResponse.json([{ session_number: 1, overall_score: 82, call_opening: null, compliance: null, empathy_communication: null, negotiation_resolution: null, date: "2025-01-01T00:00:00Z" }])),
      http.get("*/api/dashboard", () => HttpResponse.json({ total_sessions: 1, completed_sessions: 1, active_sessions: 0, total_scenarios: 1, average_overall_score: 82, category_averages: [], recent_sessions: [], total_conversations: 1, improvement_trend: null, campaign_name: null, campaign_id: null, leaderboard: [{ rank: 1, agent_id: "agent-1", agent_name: "Agent One", sessions_completed: 1, average_score: 82, best_score: 82, improvement: null }] }))
    );
    renderPage();
    await waitFor(() => expect(screen.getByText("Overall score progression")).toBeInTheDocument());
    expect(screen.getByText("Agent comparison")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
    expect(screen.getByText("All Sessions")).toBeInTheDocument();
  });

  it("explains empty score history", async () => {
    server.use(
      http.get("*/api/dashboard/agents", () => HttpResponse.json([])),
      http.get("*/api/dashboard/sessions", () => HttpResponse.json({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 })),
      http.get("*/api/dashboard/score-history", () => HttpResponse.json([])),
      http.get("*/api/dashboard", () => HttpResponse.json({ leaderboard: [] }))
    );
    renderPage();
    await waitFor(() => expect(screen.getByText(/No scored evaluations yet/i)).toBeInTheDocument());
  });

  it("requests score history for the selected agent", async () => {
    const scoreHistoryUrls: string[] = [];
    server.use(
      http.get("*/api/dashboard/agents", () => HttpResponse.json([{ id: "agent-1", full_name: "Agent One", email: "one@test.com" }])),
      http.get("*/api/dashboard/sessions", () => HttpResponse.json({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 })),
      http.get("*/api/dashboard/score-history", ({ request }) => { scoreHistoryUrls.push(request.url); return HttpResponse.json([]); }),
      http.get("*/api/dashboard", () => HttpResponse.json({ leaderboard: [] }))
    );
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Filter by agent" }));
    await user.click(screen.getByRole("option", { name: "Agent One" }));
    await waitFor(() => expect(scoreHistoryUrls.some((url) => url.includes("agent_id=agent-1"))).toBe(true));
  });

  it("keeps search and status filters in session requests and export", async () => {
    const urls: string[] = [];
    server.use(
      http.get("*/api/dashboard/agents", () => HttpResponse.json([])),
      http.get("*/api/dashboard/sessions", ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 });
      }),
      http.get("*/api/dashboard/score-history", () => HttpResponse.json([])),
      http.get("*/api/dashboard", () => HttpResponse.json({ leaderboard: [] })),
    );
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Search sessions" }), "billing");
    await user.click(screen.getByRole("button", { name: "Filter by status" }));
    await user.click(screen.getByRole("option", { name: "Completed" }));
    await waitFor(() => expect(urls.some((url) => url.includes("search=billing") && url.includes("status=completed"))).toBe(true));
  });

  it("filters sessions by date, resets pagination, clears dates, and reuses the range for export", async () => {
    const urls: string[] = [];
    server.use(
      http.get("*/api/dashboard/agents", () => HttpResponse.json([])),
      http.get("*/api/dashboard/sessions", ({ request }) => {
        urls.push(request.url);
        const page = new URL(request.url).searchParams.get("page");
        return HttpResponse.json({ items: [], total: 0, page: Number(page), page_size: 15, total_pages: 1 });
      }),
      http.get("*/api/dashboard/score-history", () => HttpResponse.json([])),
      http.get("*/api/dashboard", () => HttpResponse.json({ leaderboard: [] })),
    );
    renderPage();
    const user = userEvent.setup();
    const startDate = screen.getByLabelText("Filter sessions from date");
    const endDate = screen.getByLabelText("Filter sessions through date");
    expect(startDate).toBeVisible();
    expect(endDate).toBeVisible();

    fireEvent.change(startDate, { target: { value: "2026-08-01" } });
    fireEvent.change(endDate, { target: { value: "2026-08-07" } });
    await waitFor(() => expect(urls.some((url) => {
      const params = new URL(url).searchParams;
      return params.get("start_date") === "2026-08-01" && params.get("end_date") === "2026-08-07" && params.get("page") === "1";
    })).toBe(true));

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Download CSV" }));
    await waitFor(() => expect(urls.some((url) => {
      const params = new URL(url).searchParams;
      return params.get("start_date") === "2026-08-01" && params.get("end_date") === "2026-08-07" && params.get("page") === "1" && params.get("page_size") === "1000";
    })).toBe(true));

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(urls.some((url) => {
      const params = new URL(url).searchParams;
      return !params.has("start_date") && !params.has("end_date");
    })).toBe(true));
  });

  it("sends the authenticated bearer token on every page request and export", async () => {
    const seenHeaders: string[] = [];
    const handler = ({ request }: { request: Request }) => {
      seenHeaders.push(request.headers.get("authorization") ?? "");
      return HttpResponse.json([]);
    };
    server.use(
      http.get("*/api/dashboard/agents", handler),
      http.get("*/api/dashboard/sessions", ({ request }) => {
        seenHeaders.push(request.headers.get("authorization") ?? "");
        return HttpResponse.json({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 });
      }),
      http.get("*/api/dashboard/score-history", handler),
      http.get("*/api/dashboard", handler),
    );

    renderPage();
    await waitFor(() => expect(seenHeaders).toHaveLength(4));
    expect(seenHeaders).toEqual(["Bearer test-admin-token-marker", "Bearer test-admin-token-marker", "Bearer test-admin-token-marker", "Bearer test-admin-token-marker"]);

    await userEvent.setup().click(screen.getByRole("button", { name: "Export" }));
    await userEvent.setup().click(screen.getByRole("button", { name: "Download CSV" }));
    await waitFor(() => expect(seenHeaders).toHaveLength(5));
    expect(seenHeaders[4]).toBe("Bearer test-admin-token-marker");
  });

  it("logs out and redirects when an Agents-page request returns 401", async () => {
    const logout = vi.fn();
    useAuthStore.setState({ logout });
    server.use(
      http.get("*/api/dashboard/agents", () => new HttpResponse(null, { status: 401 })),
      http.get("*/api/dashboard/sessions", () => HttpResponse.json({ items: [], total: 0, page: 1, page_size: 15, total_pages: 1 })),
      http.get("*/api/dashboard/score-history", () => HttpResponse.json([])),
      http.get("*/api/dashboard", () => HttpResponse.json({ leaderboard: [] })),
    );

    renderPage();
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });
});
