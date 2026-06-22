"use client";

import { useRef, useCallback } from "react";
import type { AuthStatus, AuthFieldErrors } from "@/lib/auth/types";
import { AuthInput } from "./AuthInput";
import { PasswordInput } from "./PasswordInput";
import { PrimaryAuthButton } from "./PrimaryAuthButton";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { AuthSwitchLink } from "./AuthSwitchLink";

interface LoginFormProps {
  status: AuthStatus;
  fieldErrors: AuthFieldErrors;
  buttonMessage: string;
  role?: "agent" | "admin";
  onSubmit: (email: string, password: string) => void;
  onForgotPassword: () => void;
  onSignup: () => void;
  onGoogle: () => void;
  onLark: () => void;
  onFieldChange: () => void;
  onBackToRoles?: () => void;
}

export function LoginForm({
  status,
  fieldErrors,
  buttonMessage,
  role,
  onSubmit,
  onForgotPassword,
  onSignup,
  onGoogle,
  onLark,
  onFieldChange,
  onBackToRoles,
}: LoginFormProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const isSubmitting = status === "submitting";

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
    <section aria-label="Log in" className="w-full grid gap-[10px] md:gap-[14px]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full grid gap-2 md:gap-[14px]"
      >
        {role && (
          <button
            type="button"
            onClick={onBackToRoles}
            className="flex items-center gap-1.5 px-0 py-2 border-0 bg-transparent cursor-pointer hover:opacity-70 transition-opacity"
          >
            <span className="text-[11px] md:text-xs font-semibold text-[#2B2339]/50">←</span>
            <span className="text-[11px] md:text-xs font-medium text-[#2B2339]/70">
              Signing in as{" "}
              <span className="font-bold text-[#8F6AE0]">
                {role === "admin" ? "Administrator" : "Agent"}
              </span>
            </span>
          </button>
        )}

        <AuthInput
          ref={emailRef}
          id="login-email"
          type="email"
          label="Email"
          placeholder="Email"
          autoComplete="email"
          inputMode="email"
          hasError={!!fieldErrors.email}
          errorId="login-email-error"
          aria-errormessage={fieldErrors.email}
          disabled={isSubmitting}
          onChange={onFieldChange}
        />

        <PasswordInput
          ref={passwordRef}
          id="login-password"
          label="Password"
          placeholder="Password"
          autoComplete="current-password"
          hasError={!!fieldErrors.password}
          errorId="login-password-error"
          aria-errormessage={fieldErrors.password}
          disabled={isSubmitting}
          onChange={onFieldChange}
        />

        {/* Forgot password — hidden until SMTP is configured */}
        {/* <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="border-0 p-0 bg-transparent text-[#2B2339]/[0.64] text-[10px] md:text-xs font-bold cursor-pointer hover:text-[#2B2339] transition-colors"
          >
            Forgot password?
          </button>
        </div> */}

        <PrimaryAuthButton
          status={status}
          idleLabel="Log in"
          errorMessage={buttonMessage}
          loadingLabel="Signing in"
          disabled={isSubmitting}
        />
      </form>

      <SocialAuthButtons
        onGoogle={onGoogle}
        onLark={onLark}
        disabled={isSubmitting}
      />

      <AuthSwitchLink
        text="Don't have an account?"
        linkText="Sign up"
        onClick={onSignup}
      />
    </section>
  );
}
