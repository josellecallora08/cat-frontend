"use client";

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Mic, Users, TrendingUp, Settings, LogOut, User } from "lucide-react";
import gsap from "gsap";
import { useAuthStore } from "@/stores/auth-store";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";
import GradualBlur from "@/components/react-bits/GradualBlur";

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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Scroll-aware: header floats into a compact pill when the page is scrolled.
  const scrolled = useScroll(12);

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

  // Recalculate pill position when the header reflows on scroll-shrink.
  useEffect(() => {
    const id = setTimeout(() => movePill(true), 260);
    return () => clearTimeout(id);
  }, [scrolled, movePill]);

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

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [profileOpen]);

  const navigate = useCallback(
    (href: string) => {
      if (pathname === href) return;
      router.push(href);
    },
    [pathname, router]
  );

  const initial = user?.full_name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Gradual blur overlay — blurs page content as it scrolls behind the nav */}
      <GradualBlur
        target="page"
        position="top"
        height="6rem"
        strength={2}
        divCount={5}
        curve="bezier"
        exponential
        opacity={1}
        zIndex={40}
      />

      {/* Top bar — transparent at top; floats into a compact pill when scrolled.
          Content underneath is softened by the GradualBlur overlay. */}
      <div className="sticky top-0 z-[200] w-full px-4 pt-0 md:pt-2">
        <header
          className={cn(
            "mx-auto w-full max-w-7xl transition-all duration-300 ease-out",
            scrolled
              ? "max-w-4xl rounded-2xl border border-white/60 bg-white/40 shadow-lg shadow-black/5 backdrop-blur-2xl md:mt-1"
              : "border border-transparent bg-transparent"
          )}
        >
          <div
            className={cn(
              "mx-auto flex items-center justify-between transition-all duration-300 ease-out",
              scrolled ? "h-[54px] px-4 lg:px-5" : "h-[62px] px-6 lg:px-8"
            )}
          >
          {/* Logo — just the purple cat mascot */}
          <div className="h-9 w-9 shrink-0">
            <svg viewBox="0 0 45 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto" aria-label="CATS">
              <path d="M5.05703 10.0015C5.00487 7.22898 5.00863 3.18566 6.87563 0.914429C8.75914 -1.37682 12.7205 1.17793 14.3912 2.693C14.8837 2.40232 15.911 2.03532 16.4579 1.85597C19.8162 0.746761 23.4247 0.639425 26.843 1.54704C27.528 1.72371 29.4358 2.33698 30.0003 2.70147C31.5565 1.38808 33.6347 -0.131558 35.7876 0.015855C36.4279 0.0505432 37.1597 0.433027 37.55 0.954505C39.1667 3.11484 39.3133 6.1955 39.3349 8.79471C39.3379 9.16286 39.3382 9.63882 39.3018 9.99191C40.1648 11.459 40.8884 13.1063 41.281 14.7667C41.8761 14.9223 42.1581 15.0655 42.5848 15.5241C44.7003 17.0764 44.8138 21.955 42.8307 23.6434C42.7874 23.6908 42.6829 23.7999 42.6507 23.8466C42.655 25.5846 41.9108 27.3447 40.3231 28.1895C40.8081 29.4821 40.81 30.7308 40.235 32.0059C39.6755 33.2474 38.7311 34.163 37.451 34.6444C36.8301 34.8779 36.3236 34.9009 35.6713 34.9228C35.6108 35.2684 35.5469 35.6546 35.4244 35.9818C35.0828 36.8947 34.3797 37.725 33.5873 38.2766C32.2172 39.2134 30.5339 39.5743 28.9001 39.2813C28.2492 39.1624 27.6843 38.9512 27.1307 38.5938C26.9678 38.9074 26.7281 39.1985 26.4715 39.44C24.5708 41.2293 21.3376 41.4467 19.0797 40.2598C18.3464 39.8687 17.7198 39.3044 17.2545 38.6154C14.7091 40.1453 10.8531 39.2793 9.32122 36.7066C8.99387 36.165 8.7932 35.5565 8.73422 34.9264C8.06922 34.9211 7.46985 34.8686 6.84465 34.6171C4.59785 33.7132 3.14388 31.1155 3.83606 28.7417C3.89134 28.5522 3.95114 28.3734 4.02009 28.1884C2.3933 27.1618 1.82963 25.8717 1.69001 23.9928C1.62136 23.8076 1.53346 23.7305 1.40053 23.5896C1.22314 23.4302 0.994755 23.2398 0.861776 23.0445C-0.477208 21.0782 -0.294193 16.9291 1.68048 15.4509C2.0455 15.0012 2.50882 14.7763 3.06551 14.6751C3.583 12.9646 4.13536 11.5556 5.05703 10.0015ZM17.247 5.57391C18.893 2.87164 23.0491 2.4729 25.6051 4.04108C26.2265 4.42304 26.7453 4.95091 27.1165 5.57881C27.5866 5.08673 28.054 4.53148 28.5328 4.06177C24.1461 2.36796 20.2345 2.39332 15.8317 4.04214C16.2986 4.48577 16.8274 5.08894 17.247 5.57391Z" fill="#8F6AE0"/>
              <path d="M39.179 13.3689C39.0759 13.3158 39.0574 13.3089 38.9727 13.2329C38.9402 13.1534 38.9913 12.8561 39.0084 12.7452C39.1499 11.8276 39.2072 10.9093 39.3018 9.99191C40.1648 11.459 40.8884 13.1063 41.281 14.7667C41.8761 14.9223 42.1581 15.0655 42.5848 15.5241C44.7003 17.0764 44.8138 21.955 42.8307 23.6434C42.7874 23.6908 42.6829 23.7999 42.6507 23.8466C42.2105 24.2605 41.842 24.4134 41.2483 24.4493C40.873 25.3274 40.3654 26.1429 39.7435 26.8675C37.8329 29.0844 34.9469 30.3251 32.0826 30.6807C31.5864 30.7423 31.0833 30.7738 30.5844 30.8092C30.2453 31.6855 29.4637 31.8957 28.6121 31.8676C27.6558 31.836 26.2495 32.0885 25.7266 31.0292C25.5587 30.6936 25.5321 30.3047 25.6529 29.9494C26.035 28.8472 27.2716 28.9208 28.1979 28.9388C28.5227 28.9451 28.8712 28.9205 29.1929 28.9562C29.3579 28.9738 29.5198 29.0135 29.6743 29.074C30.1682 29.2681 30.3858 29.5399 30.5901 30.0016C34.6695 29.7937 38.6716 28.1769 40.4766 24.2382C38.4022 22.7997 38.3214 17.016 39.8969 15.1782C39.6653 14.5721 39.426 13.9689 39.179 13.3689Z" fill="#2B2339"/>
              <path d="M42.5848 15.5241C44.7003 17.0764 44.8138 21.955 42.8307 23.6434C41.1213 24.0651 40.6926 20.3158 40.7547 19.1864C40.8162 18.0742 40.9182 16.6607 41.7198 15.8004C41.9637 15.5389 42.2629 15.5164 42.5848 15.5241Z" fill="#463767"/>
              <path d="M5.05703 10.0015C5.11327 10.6807 5.18491 11.3585 5.27189 12.0343C5.31755 12.3962 5.36585 12.7578 5.4104 13.1198C5.43263 13.3004 5.23999 13.2794 5.1915 13.384C5.1226 13.5326 5.05563 13.692 4.9903 13.8429C4.80199 14.2675 4.62455 14.6968 4.45804 15.1303C5.59039 16.59 5.52568 19.346 5.37456 20.5014C5.08075 22.7477 4.10909 25.3458 1.75544 23.9521C1.73846 23.9568 1.72148 23.9615 1.70444 23.9662L1.69001 23.9928C1.62136 23.8076 1.53346 23.7305 1.40053 23.5896C1.22314 23.4302 0.994755 23.2398 0.861776 23.0445C-0.477208 21.0782 -0.294193 16.9291 1.68048 15.4509C2.0455 15.0012 2.50882 14.7763 3.06551 14.6751C3.583 12.9646 4.13536 11.5556 5.05703 10.0015Z" fill="#2B2339"/>
              <path d="M1.68048 15.4509C1.9972 15.4177 2.24512 15.4039 2.51579 15.6308C3.16582 16.2265 3.40927 17.4702 3.46657 18.3058C3.57472 19.8832 3.44323 21.8348 2.48144 23.1446C2.18883 23.5431 1.85561 23.5992 1.40053 23.5896C1.22314 23.4302 0.994755 23.2398 0.861776 23.0445C-0.477208 21.0782 -0.294193 16.9291 1.68048 15.4509Z" fill="#463767"/>
              <path d="M14.3912 2.693C14.8837 2.40232 15.911 2.03532 16.4579 1.85597C19.8162 0.746761 23.4247 0.639425 26.843 1.54704C27.528 1.72371 29.4358 2.33698 30.0003 2.70147C29.6752 2.98254 29.358 3.27265 29.0491 3.57142C28.9719 3.64508 28.5993 4.01375 28.5328 4.06177C24.1461 2.36796 20.2345 2.39332 15.8317 4.04214C15.6812 3.94548 14.5615 2.8739 14.3912 2.693Z" fill="#2B2339"/>
              <path d="M15.5235 18.0316C16.2146 17.9411 17.0797 18.222 17.6193 18.6506C18.3402 19.2234 18.7258 19.8969 18.8515 20.797L25.5842 20.7997C25.6966 20.1632 25.8811 19.6731 26.299 19.1684C26.835 18.5141 27.6131 18.1048 28.4559 18.0338C29.2845 17.9617 30.1071 18.2279 30.7364 18.7717C31.3798 19.3189 31.7722 20.1049 31.8229 20.948C31.9491 22.7638 30.6058 24.2296 28.8008 24.3351C27.0999 24.3663 25.723 23.1353 25.5804 21.4374L18.8602 21.4368C18.7943 22.0874 18.588 22.6448 18.177 23.1582C17.654 23.814 16.8893 24.232 16.0549 24.318C15.2308 24.4056 14.406 24.1593 13.765 23.6341C13.1133 23.1008 12.7018 22.3289 12.6225 21.4905C12.535 20.6385 12.798 19.7876 13.3507 19.1334C13.9225 18.4478 14.6481 18.113 15.5235 18.0316Z" fill="#2B2339"/>
              <path d="M15.645 18.7109C16.9999 18.6599 18.1413 19.7134 18.199 21.068C18.2566 22.4226 17.2089 23.5692 15.8546 23.6337C14.4907 23.6985 13.3342 22.6417 13.2762 21.2776C13.2181 19.9134 14.2805 18.7622 15.645 18.7109Z" fill="#2B2339"/>
              <path d="M28.3163 18.7426C29.6666 18.5287 30.9327 19.4557 31.1368 20.8075C31.3409 22.1593 30.4049 23.4187 29.0516 23.6131C27.712 23.8055 26.4682 22.8811 26.2661 21.5429C26.0641 20.2047 26.9796 18.9542 28.3163 18.7426Z" fill="#2B2339"/>
              <path d="M34.7529 2.6205C35.2708 2.56738 35.6738 2.64215 36.0138 3.07534C36.3409 3.49204 36.533 4.05585 36.6598 4.56328C37.0435 6.09981 37.0511 7.69614 36.9156 9.26538C36.8715 9.77863 36.7912 10.2768 36.7418 10.787C36.1096 9.8151 35.6128 9.21448 34.7524 8.43696C33.2426 7.20093 32.0848 6.63769 30.1749 6.27676C31.2863 4.98998 32.9951 2.95372 34.7529 2.6205Z" fill="#2B2339"/>
              <path d="M9.07609 2.62069C9.22947 2.60732 9.46729 2.59539 9.61619 2.62223C11.2222 2.91201 13.2795 5.04877 14.2142 6.28706C12.6581 6.51838 11.2188 7.18664 9.97938 8.14521C8.93234 9.02016 8.3959 9.62824 7.65677 10.7828C7.37402 8.79264 7.21289 6.76711 7.67197 4.79224C7.87149 3.93375 8.14591 2.91475 9.07609 2.62069Z" fill="#2B2339"/>
              <path d="M20.3701 25.7963C20.4165 25.795 20.5444 25.7919 20.5767 25.8129C20.9287 26.0418 21.1021 26.2989 21.5106 26.4665C22.1557 26.7312 22.9485 26.662 23.5098 26.2377C23.6729 26.1145 23.8782 25.8789 24.0634 25.806C24.139 25.7899 24.2947 25.7994 24.348 25.855C24.5488 26.0647 24.4331 26.2773 24.2821 26.4516C24.2076 26.5289 24.1372 26.599 24.0558 26.6688C23.5074 27.141 22.7899 27.3685 22.0696 27.2985C21.4285 27.2415 20.7443 26.9177 20.3167 26.4333C20.1098 26.199 20.1203 25.9834 20.3701 25.7963Z" fill="#2B2339"/>
              <path d="M14.6125 14.7869C14.9873 14.7528 16.0922 14.827 16.2885 15.2796C16.4884 15.7407 15.9158 15.7336 15.6071 15.5912C15.3182 15.458 14.897 15.4242 14.5659 15.4905L14.5247 15.4991C14.0665 15.6111 13.9448 15.833 13.5679 16.0608C13.3006 16.2223 12.9642 15.8408 13.1914 15.5634C13.5446 15.1321 14.0745 14.8911 14.6125 14.7869Z" fill="#2B2339"/>
              <path d="M29.2856 14.7879C29.7823 14.7254 30.2759 14.8347 30.7488 15.1045C31.0088 15.2529 31.8572 15.8287 31.0684 16.1023C30.9292 16.1506 30.6109 15.8167 30.4513 15.6995C30.403 15.671 30.3536 15.6442 30.3033 15.6193C29.9668 15.4556 29.6123 15.3874 29.2369 15.4734C29.0254 15.5219 28.5242 15.8104 28.3212 15.6669C28.0977 15.5089 28.1783 15.1751 28.42 15.0513C28.7042 14.9058 28.9663 14.8359 29.2856 14.7879Z" fill="#2B2339"/>
            </svg>
          </div>

          {/* Right side: nav + avatar */}
          <div className="flex items-center gap-3">
            {/* Nav pill group — F3F3F3 container with 6px padding */}
            <nav
              ref={navRef}
              aria-label="Main navigation"
              className="relative flex items-center gap-0.5 rounded-[20px] bg-[#F3F3F3] p-[6px]"
            >
              <span
                ref={pillRef}
                aria-hidden="true"
                className="absolute top-[6px] bottom-[6px] rounded-full bg-[#8F6AE0]"
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
                      "relative z-10 flex min-h-[38px] items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      active
                        ? "text-white"
                        : "text-[#2B2339] hover:text-[#2B2339]/70"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* User avatar with dropdown */}
            <div className="relative" ref={profileRef}>
              <div className="rounded-full bg-[#F3F3F3] p-[6px]">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-label="Account menu"
                  aria-expanded={profileOpen}
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-[#2B2339] text-sm font-bold text-[#2B2339] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {initial}
                </button>
              </div>

              {/* Profile dropdown */}
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white shadow-lg shadow-black/10 border border-[#F3F3F3] py-2 z-[210]">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-[#F3F3F3]">
                    <p className="text-sm font-semibold text-[#2B2339] truncate">{user?.full_name ?? "User"}</p>
                    <p className="text-xs text-[#2B2339]/50 truncate">{user?.email ?? ""}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold text-[#8F6AE0] bg-[#8F6AE0]/10 rounded-full capitalize">{user?.role ?? "agent"}</span>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#2B2339] hover:bg-[#F3F3F3] transition-colors"
                    >
                      <User className="h-4 w-4 text-[#2B2339]/60" />
                      Profile
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#2B2339] hover:bg-[#F3F3F3] transition-colors"
                    >
                      <Settings className="h-4 w-4 text-[#2B2339]/60" />
                      Settings
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-[#F3F3F3] pt-1">
                    <button
                      onClick={() => { setProfileOpen(false); logout(); router.push("/login"); }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </header>
      </div>

      {/* Main content */}
      <main className="flex-1">
        <div ref={contentRef} className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white/80 border-t border-[#F3F3F3]">
        <div className="mx-auto flex h-[34px] max-w-7xl items-center justify-between px-8">
          <div className="flex items-center gap-4 text-[11px] text-[#0A0A0B]/60 font-medium">
            <span>Collection Agent Training System</span>
            <span>Version:1.0.0-beta.1</span>
          </div>
          <button
            aria-label="Settings"
            className="flex h-5 w-5 items-center justify-center text-[#0A0A0B]/40 hover:text-[#0A0A0B]/70 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
