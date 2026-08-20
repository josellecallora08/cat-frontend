import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Component under test does not exist yet (TASK 37.2). This import is expected to fail,
// which is the desired TDD red state for task 37.1.
import { LifecycleStepper } from "./lifecycle-stepper";

// Expected API (see design.md §6/§10):
//   <LifecycleStepper status={standard.status} validation={validation} />
// - `status` mirrors the backend NegotiationStandard status: "draft" | "published" | "archived".
// - `validation` mirrors the in-memory `ValidationResponse | null` already held by
//   standard-editor.tsx (i.e. `{ valid: boolean, weight_total: number, errors: [...] }`).
//   Only `validation?.valid` is used to distinguish "Draft" from "Validated"; no new
//   backend field is introduced.

const STEP_LABELS = ["Draft", "Validated", "Published", "Archived"];

describe("LifecycleStepper", () => {
  it("renders all four steps in order", () => {
    render(<LifecycleStepper status="draft" validation={null} />);
    STEP_LABELS.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("marks Draft as the current step with aria-current=\"step\" when unvalidated", () => {
    render(<LifecycleStepper status="draft" validation={null} />);
    const current = screen.getByText("Draft").closest("[aria-current]");
    expect(current).toHaveAttribute("aria-current", "step");

    STEP_LABELS.filter((label) => label !== "Draft").forEach((label) => {
      expect(screen.getByText(label).closest("[aria-current='step']")).not.toBeInTheDocument();
    });
  });

  it("marks Published as the current step for a published standard", () => {
    render(<LifecycleStepper status="published" validation={{ valid: true, weight_total: 100, errors: [] }} />);
    const current = screen.getByText("Published").closest("[aria-current]");
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("marks Archived as the current step for an archived standard", () => {
    render(<LifecycleStepper status="archived" validation={null} />);
    const current = screen.getByText("Archived").closest("[aria-current]");
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("exposes a visually-hidden \"Step X of 4: {label}\" equivalent for screen readers", () => {
    render(<LifecycleStepper status="published" validation={{ valid: true, weight_total: 100, errors: [] }} />);
    const hidden = screen.getByText("Step 3 of 4: Published");
    expect(hidden).toHaveClass("sr-only");
  });

  it("derives \"Validated\" from validation.valid rather than any backend status field", () => {
    // Same backend status ("draft") but validation.valid flips true -> current step moves
    // from Draft to Validated purely from in-memory validation state.
    const { rerender } = render(<LifecycleStepper status="draft" validation={{ valid: false, weight_total: 80, errors: [] }} />);
    expect(screen.getByText("Draft").closest("[aria-current]")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Validated").closest("[aria-current='step']")).not.toBeInTheDocument();

    rerender(<LifecycleStepper status="draft" validation={{ valid: true, weight_total: 100, errors: [] }} />);
    expect(screen.getByText("Validated").closest("[aria-current]")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Draft").closest("[aria-current='step']")).not.toBeInTheDocument();

    // Once actually published, status alone (not validation) determines the step, since
    // published/archived map 1:1 to backend status per design.md §6.
    rerender(<LifecycleStepper status="published" validation={null} />);
    expect(screen.getByText("Published").closest("[aria-current]")).toHaveAttribute("aria-current", "step");
  });

  it("uses only existing color tokens for step state and pairs state with text, not color alone", () => {
    const { container } = render(<LifecycleStepper status="published" validation={{ valid: true, weight_total: 100, errors: [] }} />);

    // Draft and Validated are "done" (past), Published is "current", Archived is "upcoming".
    expect(container.innerHTML).toMatch(/bg-success/);
    expect(container.innerHTML).toMatch(/bg-primary/);
    expect(container.innerHTML).toMatch(/bg-muted/);

    // No new/foreign color tokens are introduced by this component.
    expect(container.innerHTML).not.toMatch(/bg-destructive/);
    expect(container.innerHTML).not.toMatch(/bg-warning/);
    expect(container.innerHTML).not.toMatch(/bg-accent/);

    // Every step still renders its plain-text label so state is never signaled by color alone.
    STEP_LABELS.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    // The screen-reader step-position text doubles as the non-color state signal for the
    // current step (icon/text pairing equivalent called for in design.md §11).
    expect(screen.getByText("Step 3 of 4: Published")).toBeInTheDocument();
  });
});
