import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "@/stores/auth-store";
import { ScriptUploadPanel } from "./script-upload-panel";

describe("ScriptUploadPanel", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: "admin-token" });
  });

  it("exposes an accessible keyboard-operable upload control", () => {
    render(<ScriptUploadPanel />);

    const dropZone = screen.getByRole("button", {
      name: /drag and drop your document here/i,
    });
    expect(dropZone).toHaveAttribute("tabindex", "0");
    expect(dropZone).toHaveAttribute("aria-describedby", "upload-help");
  });

  it("announces unsupported file security errors and offers retry", async () => {
    render(<ScriptUploadPanel />);

    const input = document.querySelector<HTMLInputElement>("#training-document");
    expect(input).not.toBeNull();
    fireEvent.change(input!, {
      target: { files: [new File(["unsafe"], "payload.exe", { type: "application/octet-stream" })] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Unsupported file type");
    expect(screen.getByRole("button", { name: /retry upload/i })).toBeInTheDocument();
  });

  it("locks upload to a supplied scenario without showing a scenario selector", () => {
    render(<ScriptUploadPanel scenarioId="scenario-1" scenarioName="Disputed Charges" />);

    expect(screen.queryByRole("combobox", { name: /scenario/i })).not.toBeInTheDocument();
    expect(screen.getByText("Disputed Charges")).toBeInTheDocument();
  });
});
