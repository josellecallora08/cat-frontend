import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VersionHistory } from "./version-history";
import type { VersionResponse } from "@/lib/api/negotiation-standards";

function makeVersion(overrides: Partial<VersionResponse> = {}): VersionResponse {
  return {
    id: "version-1",
    standard_id: "standard-1",
    version_number: 1,
    schema_version: 1,
    snapshot: { schema_version: 1, overall_passing_score: 70, blocks: [] },
    content_hash: "hash",
    created_by: "admin-1",
    published_by: "admin-1",
    created_at: "2024-01-01T00:00:00Z",
    published_at: "2024-01-02T00:00:00Z",
    publication_note: null,
    ...overrides,
  };
}

describe("VersionHistory publication note and active-version badge", () => {
  it("renders the publication note beneath the date when present", () => {
    const versions = [makeVersion({ publication_note: "Initial release" })];
    render(<VersionHistory versions={versions} onSelect={vi.fn()} />);
    expect(screen.getByText("Initial release")).toBeInTheDocument();
  });

  it("does not render a publication note when absent", () => {
    const versions = [makeVersion({ publication_note: null })];
    render(<VersionHistory versions={versions} onSelect={vi.fn()} />);
    expect(screen.queryByText("Initial release")).not.toBeInTheDocument();
  });

  it("marks the standard's current version with a 'Currently active' badge", () => {
    const versions = [
      makeVersion({ id: "version-1", version_number: 1 }),
      makeVersion({ id: "version-2", version_number: 2 }),
    ];
    render(<VersionHistory versions={versions} currentVersionId="version-2" onSelect={vi.fn()} />);

    const badges = screen.getAllByText("Currently active");
    expect(badges).toHaveLength(1);
    expect(badges[0].closest("button")).toHaveTextContent("Version 2");
  });

  it("renders no 'Currently active' badge when no version is current", () => {
    const versions = [makeVersion()];
    render(<VersionHistory versions={versions} onSelect={vi.fn()} />);
    expect(screen.queryByText("Currently active")).not.toBeInTheDocument();
  });
});
