import { NextRequest, NextResponse } from "next/server";

/** Route paths that do not require authentication. */
const PUBLIC_PATHS = ["/login", "/auth"];

/** Path prefixes for static assets that bypass all middleware logic. */
const STATIC_PREFIXES = ["/_next/static", "/_next/image", "/favicon.ico"];

/** Path prefix that requires the admin role. */
const ADMIN_PREFIX = "/admin";

/**
 * Next.js edge middleware for route protection.
 *
 * Runs before every matched request and enforces:
 * 1. Static asset bypass — no auth checks for framework assets.
 * 2. Authentication gate — unauthenticated users are redirected to `/login`
 *    with a `redirectTo` query parameter preserving the original path.
 * 3. Authenticated-on-public redirect — logged-in users on `/login` or
 *    `/auth/*` are sent to `/`.
 * 4. Role-based admin restriction — only users with `role === "admin"` in the
 *    `cat_user` cookie may access `/admin` routes.
 *
 * @param request - The incoming edge request.
 * @returns A `NextResponse` that either continues or redirects the request.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // 1. Static asset bypass
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cat_token")?.value;
  const isAuthenticated = !!token && token.trim().length > 0;
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // 2. Unauthenticated on protected route → redirect to login
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Authenticated on public path → redirect to home
  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 4. Role-based admin check (only reached when authenticated)
  if (isAuthenticated && pathname.startsWith(ADMIN_PREFIX)) {
    const role = extractRole(request);
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Determines whether a pathname refers to a static asset that should bypass
 * authentication and role checks entirely.
 *
 * @param pathname - The URL pathname from the incoming request.
 * @returns `true` if the path is a known static asset prefix.
 */
function isStaticAsset(pathname: string): boolean {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Extracts the user role from the `cat_user` cookie.
 *
 * The cookie is expected to contain a JSON-serialized object with a `role`
 * field. If the cookie is missing, empty, or contains malformed JSON, the
 * function defaults to `"user"` (non-admin) to enforce least-privilege access.
 *
 * @param request - The incoming edge request.
 * @returns The user's role string, defaulting to `"user"`.
 */
function extractRole(request: NextRequest): string {
  const userCookie = request.cookies.get("cat_user")?.value;
  if (!userCookie) return "user";
  try {
    const parsed = JSON.parse(userCookie) as { role?: string };
    return parsed.role ?? "user";
  } catch {
    return "user";
  }
}

/**
 * Middleware route matcher configuration.
 *
 * Excludes static files and assets from middleware execution using a negative
 * lookahead pattern. This ensures only navigational requests are processed.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
