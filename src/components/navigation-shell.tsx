"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect, useCallback } from "react";
import { LayoutGrid, Mic, BarChart3, Sparkles } from "lucide-react";
import gsap from "gsap";
import Dock, { type DockItemData } from "@/components/dock/Dock";
import catsLogo from "@/assets/CATS-SIDEBAR-LOGO.svg";

export function NavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(pathname);

  // GSAP page transition on route change
  useEffect(() => {
    if (prevPathRef.current !== pathname && contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 14, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          ease: "power3.out",
        }
      );
    }
    prevPathRef.current = pathname;
  }, [pathname]);

  const navigate = useCallback(
    (href: string) => {
      if (pathname === href) return;
      // Animate out, then navigate
      if (contentRef.current) {
        gsap.to(contentRef.current, {
          opacity: 0,
          y: -10,
          scale: 0.98,
          duration: 0.25,
          ease: "power2.in",
          onComplete: () => router.push(href),
        });
      } else {
        router.push(href);
      }
    },
    [pathname, router]
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const dockItems: DockItemData[] = [
    {
      icon: <LayoutGrid size={22} />,
      label: "Scenarios",
      onClick: () => navigate("/"),
      active: isActive("/"),
    },
    {
      icon: <Mic size={22} />,
      label: "Sessions",
      onClick: () => navigate("/sessions"),
      active: isActive("/sessions"),
    },
    {
      icon: <BarChart3 size={22} />,
      label: "Results",
      onClick: () => navigate("/results"),
      active: isActive("/results"),
    },
    {
      icon: <Sparkles size={22} />,
      label: "Create Scenario",
      onClick: () => navigate("/scenarios/create"),
      active: isActive("/scenarios/create"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar with logo */}
      <header className="sticky top-0 z-50 flex items-center border-b border-border/50 bg-background/60 backdrop-blur-xl px-6 py-3">
        <Image
          src={catsLogo}
          alt="CATS - Collection Agent Trainer System"
          className="w-56 h-auto brightness-0 invert"
          priority
        />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-28">
        <div ref={contentRef} className="p-8">
          {children}
        </div>
      </main>

      {/* Bottom Dock */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <Dock
            items={dockItems}
            panelHeight={64}
            baseItemSize={48}
            magnification={72}
            distance={180}
            spring={{ mass: 0.1, stiffness: 170, damping: 14 }}
          />
        </div>
      </div>
    </div>
  );
}
