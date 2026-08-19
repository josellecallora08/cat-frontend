import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { StandardApiError, type StandardResponse } from "@/lib/api/negotiation-standards";
import type { NegotiationStandardContent } from "@/lib/negotiation-standard-types";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async () => ({})),
  update: vi.fn(async () => ({})),
  validate: vi.fn(async (): Promise<{ valid: boolean; weight_total: number; errors: Array<{ code: string; path: string; message: string }> }> => ({ valid: true, weight_total: 100, errors: [] })),
  publish: vi.fn(async () => ({ version_number: 2 })),
  publishPending: false,
  archive: vi.fn(async () => ({})),
  reopen: vi.fn(async () => ({})),
  remove: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/use-negotiation-standards", () => ({
  useCreateNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.create }),
  useUpdateNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.update }),
  useValidateNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.validate }),
  usePublishNegotiationStandard: () => ({ isPending: mocks.publishPending, mutateAsync: mocks.publish }),
  useArchiveNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.archive }),
  useReopenNegotiationStandard: () => ({ isPending: false, mutateAsync: mocks.reopen }),
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
      violations: [{ id: "late", name: "Late response", description: "Responds after an avoidable delay.", evidence_instructions: "Cite the delayed response and the surrounding exchange." }],
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

    const weights = screen.getAllByLabelText(/^Weight \(%\)/);
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

    await user.click(screen.getByRole("button", { name: "Check Readiness" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getAllByLabelText(/^Weight \(%\)/)[0]).toHaveFocus();
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
  });

  it("requires validation before publishing and confirms the new version", async () => {
    const user = userEvent.setup();
    renderEditor({ ...draft, current_version_number: 1 });

    const publishButton = screen.getByRole("button", { name: /publish/i });
    expect(publishButton).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Check Readiness" }));
    await waitFor(() => expect(publishButton).toBeEnabled());
    await user.click(publishButton);
    expect(screen.getByText("Publish this standard as version 2?")).toBeInTheDocument();
    expect(screen.getByText(/permanent snapshot/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm & Publish" }));
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
    await user.click(screen.getByRole("button", { name: "Check Readiness" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /publish/i })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /publish/i }));
    mocks.publishPending = true;
    rendered.rerender(<QueryClientProvider client={new QueryClient()}><StandardEditor campaignId="campaign-1" standard={draft} isAdmin /></QueryClientProvider>);
    expect(document.querySelector("[class*='motion-reduce:animate-none']")).toBeInTheDocument();
    mocks.publishPending = false;
  });
});

describe("StandardEditor plain-language button copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockResolvedValue({ valid: true, weight_total: 100, errors: [] });
    mocks.publish.mockResolvedValue({ version_number: 2 });
  });

  it("labels the draft actions using plain, non-technical language", () => {
    renderEditor();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Readiness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish Standard" })).toBeInTheDocument();
  });

  it("labels the archive action using plain, non-technical language once published", () => {
    renderEditor({ ...draft, status: "published", current_version_number: 1 });
    expect(screen.getByRole("button", { name: "Archive Standard" })).toBeInTheDocument();
  });
});

describe("StandardEditor publish and archive confirmation copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockResolvedValue({ valid: true, weight_total: 100, errors: [] });
    mocks.publish.mockResolvedValue({ version_number: 2 });
  });

  it("names the target version and explains publishing is irreversible", async () => {
    const user = userEvent.setup();
    renderEditor({ ...draft, current_version_number: 1 });
    await user.click(screen.getByRole("button", { name: "Check Readiness" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Publish Standard" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Publish Standard" }));

    expect(screen.getByText("Publish this standard as version 2?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This creates a permanent snapshot. New sessions will start using version 2 right away. Version 2 cannot be edited or deleted afterward — you can always publish a new version later.",
      ),
    ).toBeInTheDocument();
  });

  it("explains that archived standards block new simulations while past sessions remain readable", async () => {
    const user = userEvent.setup();
    renderEditor({ ...draft, status: "published", current_version_number: 1 });
    await user.click(screen.getByRole("button", { name: "Archive Standard" }));

    expect(screen.getByText("Archive this standard?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Archived standards can't be used to start new simulations until you publish another one. Sessions that already used a published version keep working and keep their original scores.",
      ),
    ).toBeInTheDocument();
  });
});

describe("StandardEditor reopening a published or archived standard for editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockResolvedValue({ valid: true, weight_total: 100, errors: [] });
    mocks.reopen.mockResolvedValue({});
  });

  it("shows an 'Edit this standard' action for a published standard and disables direct field edits until reopened", () => {
    renderEditor({ ...draft, status: "published", current_version_number: 1 });

    expect(screen.getByLabelText("Standard name")).toBeDisabled();
    expect(screen.getByRole("button", { name: /edit this standard/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add rubric block" })).not.toBeInTheDocument();
  });

  it("shows an 'Edit this standard' action for an archived standard too", () => {
    renderEditor({ ...draft, status: "archived", current_version_number: 1 });
    expect(screen.getByRole("button", { name: /edit this standard/i })).toBeInTheDocument();
  });

  it("does not show 'Edit this standard' for an existing draft", () => {
    renderEditor();
    expect(screen.queryByRole("button", { name: /edit this standard/i })).not.toBeInTheDocument();
  });

  it("confirms before reopening and explains the published version is unaffected", async () => {
    const user = userEvent.setup();
    renderEditor({ ...draft, status: "published", current_version_number: 1 });
    await user.click(screen.getByRole("button", { name: /edit this standard/i }));

    expect(screen.getByText("Edit this standard?")).toBeInTheDocument();
    expect(screen.getByText(/currently published version keeps working exactly as-is/i)).toBeInTheDocument();
  });

  it("calls the reopen mutation and reports success on confirm", async () => {
    const user = userEvent.setup();
    renderEditor({ ...draft, status: "published", current_version_number: 1 });
    await user.click(screen.getByRole("button", { name: /edit this standard/i }));
    const dialog = screen.getByText("Edit this standard?").closest("[role='dialog']") as HTMLElement;
    await user.click(within(dialog).getByRole("button", { name: "Edit this standard" }));

    await waitFor(() => expect(mocks.reopen).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/reopened for editing/i)).toBeInTheDocument());
  });
});

describe("StandardEditor human-readable validation error list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.publish.mockResolvedValue({ version_number: 2 });
  });

  it("groups validation errors by block/criterion name instead of showing raw JSON paths", async () => {
    const user = userEvent.setup();
    mocks.validate.mockResolvedValueOnce({
      valid: false,
      weight_total: 90,
      errors: [{ code: "required", path: "blocks.0.violations.0.description", message: "Description is required." }],
    });
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Check Readiness" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    expect(screen.queryByText(/blocks\.0\.violations\.0\.description/)).not.toBeInTheDocument();
    expect(screen.getByText("Opening → Late response: Description is required.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /jump to this block/i })).toBeInTheDocument();
  });
});

describe("StandardEditor human-readable server error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockResolvedValue({ valid: true, weight_total: 100, errors: [] });
  });

  it("maps a 403 response to a plain-language permission message", async () => {
    const user = userEvent.setup();
    mocks.update.mockRejectedValueOnce(new StandardApiError(403, {}));
    renderEditor();

    await user.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(
        screen.getByText("You don't have permission to make this change. Contact an administrator."),
      ).toBeInTheDocument(),
    );
  });

  it("maps a 404 response to a plain-language not-found message", async () => {
    const user = userEvent.setup();
    mocks.update.mockRejectedValueOnce(new StandardApiError(404, {}));
    renderEditor();

    await user.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(screen.getByText("We couldn't find this standard. It may have been removed.")).toBeInTheDocument(),
    );
  });

  it("maps a stale-revision 409 response to a plain-language reload message", async () => {
    const user = userEvent.setup();
    mocks.update.mockRejectedValueOnce(new StandardApiError(409, { code: "stale_revision" }));
    renderEditor();

    await user.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(
        screen.getByText("This draft was updated somewhere else. Reload to see the latest version before saving."),
      ).toBeInTheDocument(),
    );
  });

  it("maps an immutable/dependency-conflict 409 response to a plain-language message", async () => {
    const user = userEvent.setup();
    mocks.update.mockRejectedValueOnce(new StandardApiError(409, { code: "immutable" }));
    renderEditor();

    await user.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() =>
      expect(
        screen.getByText("Published versions can't be changed. Create a new draft instead."),
      ).toBeInTheDocument(),
    );
  });
});

describe("StandardEditor dirty-navigation guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockResolvedValue({ valid: true, weight_total: 100, errors: [] });
  });

  it("prevents the browser from closing the tab while there are unsaved changes", async () => {
    const user = userEvent.setup();
    renderEditor();

    const nameField = screen.getByLabelText("Standard name");
    await user.type(nameField, " updated");

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not block closing the tab when there are no unsaved changes", () => {
    renderEditor();

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
