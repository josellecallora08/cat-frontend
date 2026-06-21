export type AuthView = "login" | "signup" | "reset" | "resetSent";

export type AuthStatus = "idle" | "submitting" | "success" | "error";

export type AuthErrorCode =
  | "INVALID_EMAIL"
  | "MISSING_PASSWORD"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_UNVERIFIED"
  | "TOO_MANY_ATTEMPTS"
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "EMAIL_ALREADY_USED"
  | "RESET_LINK_EXPIRED"
  | "SESSION_EXPIRED";

export interface AuthFieldErrors {
  email?: string;
  password?: string;
}

export interface AuthState {
  view: AuthView;
  status: AuthStatus;
  errorCode?: AuthErrorCode;
  fieldErrors: AuthFieldErrors;
  buttonMessage: string;
}

export interface PasswordStrength {
  length: boolean;
  uppercase: boolean;
  number: boolean;
}
