"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  /** Visually hidden label for accessibility */
  label: string;
  /** The id used for aria-describedby linking */
  errorId?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ hasError, label, errorId, className, id, ...props }, ref) => {
    return (
      <div className="field-group relative">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <div className="input-wrap relative grid items-center">
          <input
            ref={ref}
            id={id}
            aria-invalid={hasError || undefined}
            aria-describedby={errorId}
            className={cn(
              "auth-field w-full h-9 md:h-12 rounded-full border border-transparent px-4 md:px-[22px] bg-white/[0.38] text-[#2B2339] text-xs md:text-[15px] font-semibold outline-none placeholder:text-[#2B2339]/[0.86] transition-all",
              "focus:border-[#8F6AE0]/[0.42] focus:shadow-[0_0_0_3px_rgba(143,106,224,0.22)] focus:bg-white/[0.52]",
              hasError && "border-[#e05264] shadow-[0_0_0_3px_rgba(224,82,100,0.15)]",
              className
            )}
            {...props}
          />
          {hasError && (
            <span
              className="absolute right-[13px] md:right-[17px] top-1/2 -translate-y-1/2 z-[2] w-4 h-4 md:w-[18px] md:h-[18px] grid place-items-center rounded-full bg-[#F05B72] text-white text-[11px] md:text-xs font-extrabold pointer-events-none"
              aria-hidden="true"
            >
              !
            </span>
          )}
        </div>
        {errorId && (
          <span id={errorId} className="sr-only" role="alert">
            {hasError ? props["aria-errormessage"] : ""}
          </span>
        )}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";
