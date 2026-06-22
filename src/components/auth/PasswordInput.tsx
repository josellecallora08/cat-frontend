"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  hasError?: boolean;
  label: string;
  errorId?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ hasError, label, errorId, className, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="field-group relative">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <div className="input-wrap relative grid items-center">
          <input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            aria-invalid={hasError || undefined}
            aria-describedby={errorId}
            className={cn(
              "auth-field w-full h-9 md:h-12 rounded-full border border-transparent pl-4 md:pl-[22px] pr-[94px] md:pr-[108px] bg-white/[0.38] text-[#2B2339] text-xs md:text-[15px] font-semibold outline-none placeholder:text-[#2B2339]/[0.86] transition-all",
              "focus:border-[#8F6AE0]/[0.42] focus:shadow-[0_0_0_3px_rgba(143,106,224,0.22)] focus:bg-white/[0.52]",
              hasError && "border-[#e05264] shadow-[0_0_0_3px_rgba(224,82,100,0.15)]",
              className
            )}
            {...props}
          />
          {hasError && (
            <span
              className="group absolute right-[70px] md:right-[86px] top-1/2 -translate-y-1/2 z-[2] w-4 h-4 md:w-[18px] md:h-[18px] grid place-items-center rounded-full bg-[#F05B72] text-white text-[11px] md:text-xs font-extrabold cursor-help"
              aria-label="Password requirements"
            >
              !
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[180px] rounded-lg bg-[#2B2339] px-3 py-2 text-[10px] md:text-[11px] font-medium text-white leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none shadow-lg">
                Password must have:
                <br />• At least 8 characters
                <br />• One uppercase letter
                <br />• One number
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2B2339]" />
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-2 md:right-[10px] h-6 md:h-[30px] min-w-[48px] md:min-w-[58px] rounded-full bg-[#2B2339]/[0.08] text-[#2B2339]/[0.78] text-[10px] md:text-[11px] font-bold border-0 cursor-pointer transition-colors hover:bg-[#2B2339]/[0.14]"
          >
            {visible ? "Hide" : "Show"}
          </button>
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

PasswordInput.displayName = "PasswordInput";
