"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { LayoutGrid, Mic, Users, TrendingUp, LogOut } from "lucide-react";
import gsap from "gsap";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import catsLogo from "@/assets/CATS-SIDEBAR-LOGO.svg";

const agentNavItems = [
  { href: "/", label: "Dashboard", icon: TrendingUp },
  { href: "/scenarios", label: "Scenarios", icon: LayoutGrid },
  { href: "/sessions", label: "Sessions", icon: Mic },
];

const adminNavItems = [
  { href: "/admin/agents", label: "Agents", icon: Users },
];

export function NavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(pathname);

  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Determine which nav items to show based on role
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? [...agentNavItems, ...adminNavItems] : agentNavItems;

  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  // Slide the active indicator under the current nav item.
  const movePill = useCallback(
    (animate: boolean) => {
      const active = navItems.find((i) => isActive(i.href));
      const el = active ? itemRefs.current[active.href] : null;
      const pill = pillRef.current;
      const nav = navRef.current;
      if (!el || !pill || !nav) {
        if (pill) gsap.set(pill, { opacity: 0 });
        return;
      }
      const navBox = nav.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      gsap.to(pill, {
        left: box.left - navBox.left,
        width: box.width,
        opacity: 1,
        duration: animate && !prefersReduced ? 0.4 : 0,
        ease: "power3.out",
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isActive, prefersReduced, isAdmin]
  );

  useLayoutEffect(() => {
    movePill(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    movePill(true);
  }, [pathname, movePill]);

  useEffect(() => {
    const onResize = () => movePill(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [movePill]);

  // Subtle page transition on route change
  useEffect(() => {
    if (prevPathRef.current !== pathname && contentRef.current && !prefersReduced) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      );
    }
    prevPathRef.current = pathname;
  }, [pathname, prefersReduced]);

  const navigate = useCallback(
    (href: string) => {
      if (pathname === href) return;
      router.push(href);
    },
    [pathname, router]
  );

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  const initial = user?.full_name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Floating top bar */}
      <div className="sticky top-0 z-50 px-4 pt-4 lg:px-6">
        <header className="mx-auto max-w-7xl rounded-2xl border border-border/50 bg-background/80 shadow-lg shadow-black/5 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-4 px-6">
            <Image
              src={catsLogo}
              alt="CATS - Collection Agent Trainer System"
              className="h-9 w-auto shrink-0"
              priority
            />

            <nav
              ref={navRef}
              aria-label="Main navigation"
              className="relative flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1"
            >
              <span
                ref={pillRef}
                aria-hidden="true"
                className="absolute top-1 bottom-1 rounded-full bg-primary"
                style={{ left: 0, width: 0, opacity: 0 }}
              />
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    ref={(el) => {
                      itemRefs.current[item.href] = el;
                    }}
                    onClick={() => navigate(item.href)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative z-10 flex min-h-9 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      active
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* User info + logout */}
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 sm:flex">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground"
                  aria-hidden="true"
                >
                  {initial}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div ref={contentRef} className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
