import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NavigationShell } from "./navigation-shell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("NavigationShell", () => {
  it("renders the app title", () => {
    render(
      <NavigationShell>
        <div>Test content</div>
      </NavigationShell>
    );

    expect(screen.getByText("CAT")).toBeInTheDocument();
    expect(screen.getByText("Collection Agent Trainer")).toBeInTheDocument();
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
