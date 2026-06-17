import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { server } from "@/test/mocks/server";
import { mockScenarios } from "@/test/mocks/handlers";
import HomePage from "./page";

// Mock next/link to render as a simple anchor
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

describe("HomePage - Scenario List", () => {
  it("shows loading skeletons initially", () => {
    renderWithProviders(<HomePage />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders scenario cards with name and type", async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Financial Hardship" })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: "Angry Customer" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Payment Extension Request" })
    ).toBeInTheDocument();

    // Scenario type badge labels displayed on cards (title-cased)
    expect(
      screen.getAllByText("Payment Extension").length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Angry Customer").length).toBeGreaterThan(0);
  });

  it("links each card to the scenario detail page", async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Financial Hardship" })
      ).toBeInTheDocument();
    });

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute(
      "href",
      `/scenarios/${mockScenarios[0].id}`
    );
    expect(links[1]).toHaveAttribute(
      "href",
      `/scenarios/${mockScenarios[1].id}`
    );
  });

  it("shows empty state when no scenarios are available", async () => {
    server.use(
      http.get("/api/scenarios", () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("No scenarios available")).toBeInTheDocument();
    });
  });

  it("shows error state with retry button on fetch failure", async () => {
    server.use(
      http.get("/api/scenarios", () => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load scenarios/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("retries fetching when retry button is clicked", async () => {
    const user = userEvent.setup();
    let callCount = 0;

    server.use(
      http.get("/api/scenarios", () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(null, { status: 500 });
        }
        return HttpResponse.json(mockScenarios);
      })
    );

    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load scenarios/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Financial Hardship" })
      ).toBeInTheDocument();
    });
  });
});
