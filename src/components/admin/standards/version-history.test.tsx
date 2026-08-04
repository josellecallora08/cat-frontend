import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { VersionResponse } from "@/lib/api/negotiation-standards";
import { VersionHistory } from "./version-history";

const version: VersionResponse = {
  id: "version-1",
  standard_id: "standard-1",
  version_number: 1,
  schema_version: 1,
  snapshot: { schema_version: 1, overall_passing_score: 70, blocks: [] },
  content_hash: "hash",
  created_by: "admin-1",
  published_by: "admin-1",
  created_at: "2026-01-01T00:00:00Z",
  published_at: "2026-01-02T00:00:00Z",
  publication_note: null,
};

describe("VersionHistory", () => {
  it("renders an empty state", () => {
    render(<VersionHistory versions={[]} onSelect={vi.fn()} />);
    expect(screen.getByText("No published versions yet.")).toBeInTheDocument();
  });

  it("selects an immutable version snapshot", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<VersionHistory versions={[version]} onSelect={onSelect} />);
    const button = screen.getByRole("button", { name: /version 1/i });
    button.focus();
    await user.keyboard("{Enter}");
    expect(button).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith(version);
  });
});
