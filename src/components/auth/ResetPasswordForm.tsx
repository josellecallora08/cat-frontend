"use client";

import { useRef, useCallback } from "react";
import type { AuthStatus, AuthFieldErrors } from "@/lib/auth/types";
import { AuthInput } from "./AuthInput";
import { PrimaryAuthButton } from "./PrimaryAuthButton";
import { AuthSwitchLink } from "./AuthSwitchLink";

interface ResetPasswordFormProps {
  status: AuthStatus;
  fieldErrors: AuthFieldErrors;
  buttonMessage: string;
  isSent: boolean;
  onSubmit: (email: string) => void;
  onBackToLogin: () => void;
  onFieldChange: () => void;
}

export function ResetPasswordForm({
  status,
  fieldErrors,
  buttonMessage,
  isSent,
  onSubmit,
  onBackToLogin,
  onFieldChange,
}: ResetPasswordFormProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const isSubmitting = status === "submitting";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const email = emailRef.current?.value ?? "";
      onSubmit(email);
    },
    [onSubmit]
  );

  if (isSent) {
    return (
      <section aria-label="Reset link sent" className="w-full grid gap-[10px] md:gap-[14px]">
        <p className="text-[10px] md:text-xs font-semibold text-[#2B2339]/[0.44] text-center">
          If an account exists with this email, we&apos;ll send a reset link.
        </p>
        <PrimaryAuthButton
          type="button"
          status="idle"
          idleLabel="Back to login"
          onClick={onBackToLogin}
        />
      </section>
    );
  }

  return (
    <section aria-label="Reset password" className="w-full grid gap-[10px] md:gap-[14px]">
      <p className="text-[10px] md:text-xs font-semibold text-[#2B2339]/[0.44] text-center">
        Enter your email and we&apos;ll send reset instructions if an account exists.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full grid gap-2 md:gap-[14px]"
      >
        <AuthInput
          ref={emailRef}
          id="reset-email"
          type="email"
          label="Email"
          placeholder="Email"
          autoComplete="email"
          inputMode="email"
          hasError={!!fieldErrors.email}
          errorId="reset-email-error"
          aria-errormessage={fieldErrors.email}
          disabled={isSubmitting}
          onChange={onFieldChange}
        />

        <PrimaryAuthButton
          status={status}
          idleLabel="Send reset link"
          errorMessage={buttonMessage}
          loadingLabel="Sending reset link"
          disabled={isSubmitting}
        />
      </form>

      <AuthSwitchLink
        text="Remember your password?"
        linkText="Back to login"
        onClick={onBackToLogin}
      />
    </section>
  );
}
