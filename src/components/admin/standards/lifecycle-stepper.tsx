import type { StandardResponse, ValidationResponse } from "@/lib/api/negotiation-standards";

interface LifecycleStepperProps {
  status: StandardResponse["status"];
  validation: ValidationResponse | null;
}

const STEP_LABELS = ["Draft", "Validated", "Published", "Archived"] as const;

/**
 * Maps the backend `status` plus in-memory validation state to the current step index.
 *
 * - "draft" splits into two presentational sub-states: "Draft" (unvalidated/invalid) and
 *   "Validated" (last readiness check returned `valid: true`). No new backend field is
 *   introduced; this is derived purely from `validation?.valid`.
 * - "published" and "archived" map 1:1 to backend status regardless of validation state.
 */
function getCurrentStepIndex(status: StandardResponse["status"], validation: ValidationResponse | null): number {
  if (status === "published") return 2;
  if (status === "archived") return 3;
  return validation?.valid ? 1 : 0;
}

/**
 * Presentational four-step lifecycle tracker: Draft -> Validated -> Published -> Archived.
 * See design.md §6/§10 for the visual spec (dot/connector sizing, color tokens, a11y notes).
 */
export function LifecycleStepper({ status, validation }: LifecycleStepperProps) {
  const currentIndex = getCurrentStepIndex(status, validation);

  return (
    <ol className="flex w-full items-center gap-2" aria-label="Standard lifecycle">
      {STEP_LABELS.map((label, index) => {
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;
        const dotColor = isCurrent ? "bg-primary" : isPast ? "bg-success" : "bg-muted";
        const labelColor = isCurrent ? "text-foreground" : "text-muted-foreground";

        return (
          <li key={label} className={`flex items-center gap-2 ${index < STEP_LABELS.length - 1 ? "flex-1" : ""}`}>
            <div className="flex items-center gap-2" {...(isCurrent ? { "aria-current": "step" as const } : {})}>
              <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} aria-hidden="true" />
              <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
              {isCurrent && <span className="sr-only">{`Step ${index + 1} of 4: ${label}`}</span>}
            </div>
            {index < STEP_LABELS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
