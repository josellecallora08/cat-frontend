import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server } from "@/test/mocks/server";
import { useAuthStore } from "@/stores/auth-store";
import SessionsPage from "./page";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><SessionsPage /></QueryClientProvider>);
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Sessions filters", () => {
  it("sends admin status/search filters and renders filtered empty state", async () => {
    useAuthStore.setState({ user: { id: "admin-1", role: "admin" } as never, token: "token" });
    const urls: string[] = [];
    server.use(http.get("*/api/dashboard/sessions", ({ request }) => {
      urls.push(request.url);
      return HttpResponse.json({ items: [], total: 0, page: 1, page_size: 8, total_pages: 1 });
    }));
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Search sessions" }), "billing");
    await user.click(screen.getByRole("tab", { name: "Completed" }));
    await waitFor(() => expect(urls.some((url) => url.includes("search=billing") && url.includes("status=completed") && url.includes("page=1"))).toBe(true));
    expect(screen.getByText("No sessions in this category")).toBeInTheDocument();
  });
});
