"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { LayoutGrid, Mic, BarChart3 } from "lucide-react";
import gsap from "gsap";
import catsLogo from "@/assets/CATS-SIDEBAR-LOGO.svg";

const navItems = [
  { href: "/", label: "Scenarios", icon: LayoutGrid },
  { href: "/sessions", label: "Sessions", icon: Mic },
  { href: "/results", label: "Results", icon: BarChart3 },
];

export function NavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(pathname);

  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const isActive = useCallback(
    (href: string) =>
      href === "/" ? pathname === "/" : pathname.startsWith(href),
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
    [isActive, prefersReduced]
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-background">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-6 lg:px-8">
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
                  className={`relative z-10 flex min-h-9 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User avatar slot */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground"
            aria-label="Account"
          >
            A
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div ref={contentRef} className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
