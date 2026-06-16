"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import catsLogo from "@/assets/CATS-SIDEBAR-LOGO.png";

const navItems = [
  { href: "/", label: "Scenarios", icon: "📋" },
  { href: "/sessions", label: "Sessions", icon: "🎙️" },
  { href: "/results", label: "Results", icon: "📊" },
];

export function NavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-8 border-b border-border flex justify-center">
          <Image
            src={catsLogo}
            alt="CATS - Collection Agent Trainer System"
            className="w-48 h-auto"
            priority
          />
        </div>
        <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
