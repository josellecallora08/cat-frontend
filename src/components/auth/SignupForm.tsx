"use client";

import { useRef, useState, useCallback } from "react";
import type { AuthStatus, AuthFieldErrors, PasswordStrength } from "@/lib/auth/types";
import { getPasswordStrength } from "@/lib/auth/validation";
import { AuthInput } from "./AuthInput";
import { PasswordInput } from "./PasswordInput";
import { PrimaryAuthButton } from "./PrimaryAuthButton";
import { PasswordRules } from "./PasswordRules";
import { AuthSwitchLink } from "./AuthSwitchLink";

interface SignupFormProps {
  status: AuthStatus;
  fieldErrors: AuthFieldErrors;
  buttonMessage: string;
  onSubmit: (email: string, password: string) => void;
  onLogin: () => void;
  onFieldChange: () => void;
}

export function SignupForm({
  status,
  fieldErrors,
  buttonMessage,
  onSubmit,
  onLogin,
  onFieldChange,
}: SignupFormProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const isSubmitting = status === "submitting";

  const [strength, setStrength] = useState<PasswordStrength>({
    length: false,
    uppercase: false,
    number: false,
  });

  const handlePasswordChange = useCallback(() => {
    const val = passwordRef.current?.value ?? "";
    setStrength(getPasswordStrength(val));
    onFieldChange();
  }, [onFieldChange]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const email = emailRef.current?.value ?? "";
      const password = passwordRef.current?.value ?? "";
      onSubmit(email, password);
    },
    [onSubmit]
  );

  return (
    <section aria-label="Sign up" className="w-full grid gap-[10px] md:gap-[14px]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full grid gap-2 md:gap-[14px]"
      >
        <AuthInput
          ref={emailRef}
          id="signup-email"
          type="email"
          label="Email"
          placeholder="Email"
          autoComplete="email"
          inputMode="email"
          hasError={!!fieldErrors.email}
          errorId="signup-email-error"
          aria-errormessage={fieldErrors.email}
          disabled={isSubmitting}
          onChange={onFieldChange}
        />

        <div className="grid gap-1">
          <PasswordInput
            ref={passwordRef}
            id="signup-password"
            label="Password"
            placeholder="Password"
            autoComplete="new-password"
            hasError={!!fieldErrors.password}
            errorId="signup-password-error"
            aria-errormessage={fieldErrors.password}
            disabled={isSubmitting}
            onChange={handlePasswordChange}
          />
          <PasswordRules strength={strength} />
        </div>

        <PrimaryAuthButton
          status={status}
          idleLabel="Create account"
          errorMessage={buttonMessage}
          loadingLabel="Creating account"
          disabled={isSubmitting}
        />
      </form>

      <AuthSwitchLink
        text="Already have an account?"
        linkText="Log in"
        onClick={onLogin}
      />

      <p className="text-[9px] md:text-xs text-[#2B2339]/[0.44] text-center">
        By continuing, you agree to the{" "}
        <a href="#privacy" className="font-bold text-[#2B2339]/[0.66] no-underline hover:text-[#2B2339] hover:underline">
          privacy
        </a>{" "}
        and{" "}
        <a href="#terms" className="font-bold text-[#2B2339]/[0.66] no-underline hover:text-[#2B2339] hover:underline">
          terms
        </a>{" "}
        policies.
      </p>
    </section>
  );
}
