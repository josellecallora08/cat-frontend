import type { AuthErrorCode } from "./types";

export const authMessages: Record<AuthErrorCode, string> = {
  INVALID_EMAIL: "Please enter a valid email address.",
  MISSING_PASSWORD: "Please enter your password.",
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  ACCOUNT_UNVERIFIED: "Please verify your email before logging in.",
  TOO_MANY_ATTEMPTS: "Too many attempts. Please wait a moment before trying again.",
  NETWORK_ERROR: "We couldn't connect. Check your internet and try again.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
  EMAIL_ALREADY_USED: "This email is already used. Try logging in instead.",
  RESET_LINK_EXPIRED: "This reset link has expired. Send a new reset link.",
  SESSION_EXPIRED: "Your session expired. Please log in again.",
  LARK_AUTH_FAILED: "Lark authentication failed. Please try again.",
  LARK_NOT_CONFIGURED: "Lark sign-in is not available right now. Please try again later.",
};

export const authButtonLabels = {
  login: { idle: "Log in", submitting: "", success: "Success" },
  signup: { idle: "Create account", submitting: "", success: "Account created" },
  reset: { idle: "Send reset link", submitting: "", success: "Sent" },
} as const;

export const resetSentMessage =
  "If an account exists with this email, we'll send a reset link.";

export const signupSuccessMessage =
  "Account created. Welcome aboard. Log in to continue.";
