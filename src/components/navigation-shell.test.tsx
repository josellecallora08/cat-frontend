import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";
import { NavigationShell } from "./navigation-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/scenarios",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/use-scroll", () => ({ useScroll: () => false }));
vi.mock("@/components/react-bits/GradualBlur", () => ({ default: () => null }));
vi.mock("gsap", () => ({
  default: { set: vi.fn(), to: vi.fn(), fromTo: vi.fn() },
}));

describe("NavigationShell script administration placement", () => {
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
      token: "admin-token",
    });
  });

  it("removes Scripts and Uploads from the main navigation", () => {
    render(<NavigationShell><div>Page</div></NavigationShell>);
    const navigation = screen.getByRole("navigation", { name: /main navigation/i });
    expect(within(navigation).queryByText("Scripts")).not.toBeInTheDocument();
    expect(within(navigation).queryByText("Uploads")).not.toBeInTheDocument();
  });

  it("shows Scripts inside the administrator account menu", () => {
    render(<NavigationShell><div>Page</div></NavigationShell>);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("button", { name: /scripts/i })).toBeInTheDocument();
  });

  it("does not show Scripts in a normal user's account menu", () => {
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
    render(<NavigationShell><div>Page</div></NavigationShell>);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.queryByRole("button", { name: /scripts/i })).not.toBeInTheDocument();
  });
});
