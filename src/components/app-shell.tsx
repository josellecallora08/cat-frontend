"use client";

import { usePathname } from "next/navigation";
import { NavigationShell } from "@/components/navigation-shell";

// Routes that render full-screen without the nav shell / footer.
// The active call is an immersive, real-call-like experience.
const SHELL_EXCLUDED_PATHS = ["/login", "/sessions/call", "/sessions/new"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show nav shell on login page
  if (SHELL_EXCLUDED_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return <NavigationShell>{children}</NavigationShell>;
}
