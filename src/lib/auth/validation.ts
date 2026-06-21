import type { AuthFieldErrors, PasswordStrength } from "./types";

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function getPasswordStrength(password: string): PasswordStrength {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
}

export function isStrongPassword(password: string): boolean {
  const s = getPasswordStrength(password);
  return s.length && s.uppercase && s.number;
}

export function validateLogin(email: string, password: string): {
  valid: boolean;
  fieldErrors: AuthFieldErrors;
  buttonMessage: string;
} {
  const fieldErrors: AuthFieldErrors = {};
  const emailInvalid = !validateEmail(email);
  const passwordMissing = !password.trim();

  if (emailInvalid) fieldErrors.email = "Please enter a valid email address.";
  if (passwordMissing) fieldErrors.password = "Please enter your password.";

  let buttonMessage = "";
  if (emailInvalid && passwordMissing) {
    buttonMessage = "Please enter a valid email and password.";
  } else if (emailInvalid) {
    buttonMessage = "Please enter a valid email address.";
  } else if (passwordMissing) {
    buttonMessage = "Please enter your password.";
  }

  return { valid: !emailInvalid && !passwordMissing, fieldErrors, buttonMessage };
}

export function validateSignup(email: string, password: string): {
  valid: boolean;
  fieldErrors: AuthFieldErrors;
  buttonMessage: string;
} {
  const fieldErrors: AuthFieldErrors = {};
  const emailInvalid = !validateEmail(email);
  const passwordWeak = !isStrongPassword(password);

  if (emailInvalid) fieldErrors.email = "Please enter a valid email address.";
  if (passwordWeak)
    fieldErrors.password =
      "Use at least 8 characters, one uppercase letter, and one number.";

  let buttonMessage = "";
  if (emailInvalid && passwordWeak) {
    buttonMessage = "Please enter a valid email and password.";
  } else if (emailInvalid) {
    buttonMessage = "Please enter a valid email address.";
  } else if (passwordWeak) {
    buttonMessage = "Use a stronger password.";
  }

  return { valid: !emailInvalid && !passwordWeak, fieldErrors, buttonMessage };
}

export function validateReset(email: string): {
  valid: boolean;
  fieldErrors: AuthFieldErrors;
  buttonMessage: string;
} {
  const emailInvalid = !validateEmail(email);
  return {
    valid: !emailInvalid,
    fieldErrors: emailInvalid ? { email: "Please enter a valid email address." } : {},
    buttonMessage: emailInvalid ? "Please enter a valid email address." : "",
  };
}
