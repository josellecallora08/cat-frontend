"use client";

import { useRef, useCallback } from "react";
import type { AuthStatus, AuthFieldErrors } from "@/lib/auth/types";
import { AuthInput } from "./AuthInput";
import { PasswordInput } from "./PasswordInput";
import { PrimaryAuthButton } from "./PrimaryAuthButton";
import { AuthSwitchLink } from "./AuthSwitchLink";

interface SignupFormProps {
  status: AuthStatus;
  fieldErrors: AuthFieldErrors;
  buttonMessage: string;
  onSubmit: (email: string, password: string, fullName: string) => void;
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
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const isSubmitting = status === "submitting";

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const firstName = firstNameRef.current?.value.trim() ?? "";
      const lastName = lastNameRef.current?.value.trim() ?? "";
      const email = emailRef.current?.value ?? "";
      const password = passwordRef.current?.value ?? "";
      const fullName = `${firstName} ${lastName}`.trim();
      onSubmit(email, password, fullName);
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
        <div className="grid grid-cols-2 gap-2">
          <AuthInput
            ref={firstNameRef}
            id="signup-firstname"
            type="text"
            label="First name"
            placeholder="First name"
            autoComplete="given-name"
            hasError={!!fieldErrors.firstName}
            errorId="signup-firstname-error"
            disabled={isSubmitting}
            onChange={onFieldChange}
          />
          <AuthInput
            ref={lastNameRef}
            id="signup-lastname"
            type="text"
            label="Last name"
            placeholder="Last name"
            autoComplete="family-name"
            hasError={!!fieldErrors.lastName}
            errorId="signup-lastname-error"
            disabled={isSubmitting}
            onChange={onFieldChange}
          />
        </div>

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
            onChange={onFieldChange}
          />
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
