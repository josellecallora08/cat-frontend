import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportSection } from "@/components/results/report-section";

describe("ReportSection responsive boundaries", () => {
  it("keeps section content in a bounded responsive container", () => {
    render(
      <ReportSection
        section={{
          name: "summary",
          state: "loaded",
          data: { text: "A long report value" },
          unavailable_reason: null,
          failure: null,
          updated_at: null,
        }}
        title="Summary"
      >
        <div data-testid="content">Report content</div>
      </ReportSection>,
    );

    expect(screen.getByTestId("content").parentElement).toHaveClass(
      "report-content-boundary",
      "max-w-full",
      "min-w-0",
    );
  });
});
