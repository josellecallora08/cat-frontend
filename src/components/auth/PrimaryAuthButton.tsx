"use client";

import type { AuthStatus } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

interface PrimaryAuthButtonProps {
  status: AuthStatus;
  idleLabel: string;
  errorMessage?: string;
  successLabel?: string;
  /** Hidden label for screen readers during loading */
  loadingLabel?: string;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}

export function PrimaryAuthButton({
  status,
  idleLabel,
  errorMessage,
  successLabel = "Success",
  loadingLabel = "Please wait",
  disabled,
  type = "submit",
  onClick,
}: PrimaryAuthButtonProps) {
  const isError = status === "error" && !!errorMessage;
  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";

  return (
    <button
      type={type}
      disabled={isSubmitting || disabled}
      onClick={onClick}
      aria-busy={isSubmitting}
      className={cn(
        "relative w-full h-9 md:h-12 rounded-full text-xs md:text-[15px] font-bold text-white border-0 cursor-pointer transition-all duration-200 inline-grid place-items-center",
        isError
          ? "bg-[#F05B72] shadow-[0_8px_18px_rgba(240,91,114,0.22)] animate-[button-nudge_0.28s_ease]"
          : "bg-[#8F6AE0] hover:bg-[#7C58CC]",
        isSubmitting && "opacity-[0.86] cursor-wait"
      )}
    >
      {isSubmitting ? (
        <>
          <span className="sr-only">{loadingLabel}</span>
          <span
            className="w-[13px] h-[13px] md:w-4 md:h-4 border-2 border-white/[0.42] border-t-white rounded-full animate-spin"
            aria-hidden="true"
          />
        </>
      ) : isSuccess ? (
        <span>{successLabel}</span>
      ) : isError ? (
        <span className="px-3 text-center leading-tight">{errorMessage}</span>
      ) : (
        <span>{idleLabel}</span>
      )}

      {/* Screen reader live region for errors */}
      <span className="sr-only" role="status" aria-live="polite">
        {isError ? errorMessage : ""}
      </span>
    </button>
  );
}
