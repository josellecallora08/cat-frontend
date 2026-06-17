import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NavigationShell } from "./navigation-shell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock next/image to a plain img (static SVG import lacks width/height in tests)
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img alt={alt} {...(props as Record<string, unknown>)} />
  ),
}));

describe("NavigationShell", () => {
  it("renders the app logo", () => {
    render(
      <NavigationShell>
        <div>Test content</div>
      </NavigationShell>
    );

    expect(
      screen.getByAltText("CATS - Collection Agent Trainer System")
    ).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(
      <NavigationShell>
        <div>Test content</div>
      </NavigationShell>
    );

    expect(screen.getByText("Scenarios")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
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
