"use client";

import type { PasswordStrength } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

interface PasswordRulesProps {
  strength: PasswordStrength;
}

const rules: { key: keyof PasswordStrength; label: string }[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "uppercase", label: "One uppercase letter" },
  { key: "number", label: "One number" },
];

export function PasswordRules({ strength }: PasswordRulesProps) {
  return (
    <div
      className="grid gap-[3px] pl-[2px] pt-[2px] text-[#2B2339]/[0.48] text-[10px] md:text-xs font-semibold"
      id="password-rules"
      aria-live="polite"
    >
      {rules.map((rule) => (
        <span
          key={rule.key}
          className={cn(
            "flex items-center gap-[5px]",
            strength[rule.key] && "text-[#4f7b37]"
          )}
        >
          <span
            className={cn(
              "w-[5px] h-[5px] rounded-full bg-current opacity-50",
              strength[rule.key] && "opacity-100"
            )}
            aria-hidden="true"
          />
          {rule.label}
        </span>
      ))}
    </div>
  );
}
