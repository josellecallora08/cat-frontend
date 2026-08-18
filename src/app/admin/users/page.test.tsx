import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { server } from "@/test/mocks/server";
import AdminUsersPage from "./page";

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      user: { id: "admin-1", email: "admin@test.com", full_name: "Admin", role: "admin", is_active: true },
      token: "test-token",
    }),
}));

const users = [
  {
    id: "user-1", email: "active@test.com", full_name: "Active User", role: "user",
    user_type: "agent", is_active: true, created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "user-2", email: "inactive@test.com", full_name: "Inactive User", role: "user",
    user_type: "trainer", is_active: false, created_at: "2025-01-02T00:00:00Z",
  },
];

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><AdminUsersPage /></QueryClientProvider>);
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AdminUsersPage metrics", () => {
  it("renders total and active counts for mixed users", async () => {
    server.use(http.get("*/api/admin/users", () => HttpResponse.json(users)));
    renderPage();

    await waitFor(() => expect(screen.getByText("Active User")).toBeInTheDocument());
    expect(screen.getByRole("region", { name: "User metrics" })).toHaveTextContent("Total Users2");
    expect(screen.getByRole("region", { name: "User metrics" })).toHaveTextContent("Active Users1");
  });

  it("renders zero metrics and keeps the empty state usable", async () => {
    server.use(http.get("*/api/admin/users", () => HttpResponse.json([])));
    renderPage();

    await waitFor(() => expect(screen.getByText("No users found")).toBeInTheDocument());
    const metrics = screen.getByRole("region", { name: "User metrics" });
    expect(metrics).toHaveTextContent("Total Users0");
    expect(metrics).toHaveTextContent("Active Users0");
    expect(screen.getAllByRole("button", { name: "Create User" }).length).toBeGreaterThan(1);
  });

  it("counts all-active users as active", async () => {
    server.use(http.get("*/api/admin/users", () => HttpResponse.json(users.map((user) => ({ ...user, is_active: true })))));
    renderPage();

    await waitFor(() => expect(screen.getByText("Active User")).toBeInTheDocument());
    expect(screen.getByRole("region", { name: "User metrics" })).toHaveTextContent("Active Users2");
  });
});
