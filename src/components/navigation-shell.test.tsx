import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavigationShell } from "./navigation-shell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock next/image to a plain img (static SVG import lacks width/height in tests)
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...(props as Record<string, unknown>)} />
  ),
}));

// Mock GSAP to avoid animation issues in tests
vi.mock("gsap", () => ({
  default: {
    set: vi.fn(),
    to: vi.fn(),
    fromTo: vi.fn(),
  },
}));

// Mock the GradualBlur component
vi.mock("@/components/react-bits/GradualBlur", () => ({
  default: () => null,
}));

// Mock use-scroll hook
vi.mock("@/hooks/use-scroll", () => ({
  useScroll: () => false,
}));

describe("NavigationShell", () => {
  it("renders the app logo", () => {
    render(
      <NavigationShell>
        <div>Test content</div>
      </NavigationShell>
    );

    expect(
      screen.getByLabelText("CATS")
    ).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(
      <NavigationShell>
        <div>Test content</div>
      </NavigationShell>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Scenarios")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <NavigationShell>
        <div>Test content</div>
      </NavigationShell>
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("has accessible navigation landmark", () => {
    render(
      <NavigationShell>
        <div>Test content</div>
      </NavigationShell>
    );

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });
});
