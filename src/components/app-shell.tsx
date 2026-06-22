"use client";

import { usePathname } from "next/navigation";
import { NavigationShell } from "@/components/navigation-shell";

const SHELL_EXCLUDED_PATHS = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show nav shell on login page or results page
  const isExcluded =
    SHELL_EXCLUDED_PATHS.some((p) => pathname.startsWith(p)) ||
    /^\/sessions\/[^/]+\/results/.test(pathname);

  if (isExcluded) {
    return <>{children}</>;
  }

  return <NavigationShell>{children}</NavigationShell>;
}
