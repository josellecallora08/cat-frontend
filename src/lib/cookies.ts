/**
 * Cookie utility functions for setting and removing browser cookies.
 * Used by the auth store to synchronize tokens with Next.js edge middleware.
 */

export interface CookieOptions {
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
  maxAge?: number;
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * Sets a cookie with the given name, value, and options.
 * The `secure` flag defaults to `true` in production environments.
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const secure = options.secure ?? isProduction;

  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.path) {
    parts.push(`path=${options.path}`);
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (secure) {
    parts.push("Secure");
  }

  if (options.maxAge !== undefined) {
    parts.push(`max-age=${options.maxAge}`);
  }

  document.cookie = parts.join("; ");
}

/**
 * Removes a cookie by setting its max-age to 0.
 */
export function removeCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}
