import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { StandardResponse } from "@/lib/api/negotiation-standards";
import type { NegotiationStandardContent } from "@/lib/negotiation-standard-types";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async () => ({})),
  update: vi.fn(async () => ({})),
  validate: vi.fn(async (): Promise<{ valid: boolean; weight_total: number; errors: Array<{ code: string; path: string; message: string }> }> => ({ valid: true, weight_total: 100, errors: [] })),
  publish: vi.fn(async () => ({ version_number: 2 })),
  publishPending: false,
  archive: vi.fn(async () => ({})),
  remove: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/use-negotiation-standards", () => ({
  useCreateNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.create }),
  useUpdateNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.update }),
  useValidateNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.validate }),
  usePublishNegotiationStandard: () => ({ isPending: mocks.publishPending, mutateAsync: mocks.publish }),
  useArchiveNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.archive }),
  useDeleteNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.remove }),
  useNegotiationStandardVersions: () => ({ data: { items: [] } }),
}));

import { StandardEditor } from "./standard-editor";

const content: NegotiationStandardContent = {
  schema_version: 1,
  overall_passing_score: 70,
  blocks: [
    {
      id: "opening",
      category: "Opening",
      weight: 50,
      passing_score: 70,
      scoring_instructions: "Use evidence.",
      positive_behaviors: [],
      violations: [{ id: "late", name: "Late response", description: "", evidence_instructions: "" }],
      penalties: [],
      recommendation_guidance: "Practice the opening.",
      display_order: 0,
    },
    {
      id: "closing",
      category: "Closing",
      weight: 50,
      passing_score: 70,
      scoring_instructions: "Close clearly.",
      positive_behaviors: [],
      violations: [],
      penalties: [],
      recommendation_guidance: "Practice the close.",
      display_order: 1,
    },
  ],
};

const draft: StandardResponse = {
  id: "standard-1",
  campaign_id: "campaign-1",
  name: "Negotiation standard",
  description: "Draft",
  status: "draft",
  revision: 1,
  draft_content: content,
  current_version_id: null,
  current_version_number: null,
};

function renderEditor(standard: StandardResponse | null = draft) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><StandardEditor campaignId="campaign-1" standard={standard} isAdmin /></QueryClientProvider>);
}

describe("StandardEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockResolvedValue({ valid: true, weight_total: 100, errors: [] });
    mocks.publish.mockResolvedValue({ version_number: 2 });
  });

  it("adds and removes nested rubric items and keeps the selected block active while reordering", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText("100%"), "the initial weight summary").toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Add behavior" })[0]);
    expect(screen.getByDisplayValue("New behavior")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove behavior" }));

    await user.click(screen.getAllByRole("button", { name: "Add penalty" })[0]);
    expect(screen.getByLabelText("Deduction")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /remove penalty for late/i }));
    expect(screen.queryByLabelText("Deduction")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /02Closing50% weight/i }));
    await user.click(screen.getByRole("button", { name: "Move Closing up" }));
    expect(screen.getByRole("tab", { name: /02Closing50% weight/i })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps saving enabled for an invalid total and announces the updated weight", async () => {
    const user = userEvent.setup();
    renderEditor();

    const weights = screen.getAllByLabelText("Weight (%)");
    await user.clear(weights[0]);
    await user.type(weights[0], "40");

    expect(screen.getByText("90%", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
    expect(screen.getByText("10% remaining")).toBeInTheDocument();
  });

  it("focuses the first invalid field after server validation", async () => {
    const user = userEvent.setup();
    mocks.validate.mockResolvedValueOnce({
      valid: false,
      weight_total: 90,
      errors: [{ code: "weight_total", path: "blocks.0.weight", message: "Weights must total 100" }],
    });
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Validate" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getAllByLabelText("Weight (%)")[0]).toHaveFocus();
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
  });

  it("requires validation before publishing and confirms the new version", async () => {
    const user = userEvent.setup();
    renderEditor();

    const publishButton = screen.getByRole("button", { name: /publish/i });
    expect(publishButton).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Validate" }));
    await waitFor(() => expect(publishButton).toBeEnabled());
    await user.click(publishButton);
    expect(screen.getByText("Publish negotiation standard?")).toBeInTheDocument();
    expect(screen.getByText(/immutable version/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm publish" }));
    await waitFor(() => expect(screen.getByText("Published version 2.")).toBeInTheDocument());
  });

  it("renders published snapshots read-only", () => {
    renderEditor({ ...draft, status: "published", current_version_number: 1 });

    expect(screen.getByLabelText("Standard name")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Add rubric block" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add behavior" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Version 1").length).toBeGreaterThan(0);
  });

  it("supports keyboard-only save and exposes responsive overflow protection", async () => {
    const user = userEvent.setup();
    const { container } = renderEditor();
    const saveButton = screen.getByRole("button", { name: /save draft/i });
    saveButton.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());

    for (const width of [320, 640, 768, 1024, 1440]) {
      window.innerWidth = width;
      expect(container.firstElementChild).toHaveClass("overflow-x-hidden");
      expect(screen.getByRole("tablist", { name: "Rubric block navigation" })).toBeInTheDocument();
    }
  });

  it("disables motion animation for reduced-motion users", async () => {
    const user = userEvent.setup();
    const rendered = renderEditor();
    await user.click(screen.getByRole("button", { name: "Validate" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /publish/i })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /publish/i }));
    mocks.publishPending = true;
    rendered.rerender(<QueryClientProvider client={new QueryClient()}><StandardEditor campaignId="campaign-1" standard={draft} isAdmin /></QueryClientProvider>);
    expect(document.querySelector("[class*='motion-reduce:animate-none']")).toBeInTheDocument();
    mocks.publishPending = false;
  });
});
