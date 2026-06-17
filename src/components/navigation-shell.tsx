"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const agentNavItems = [
  { href: "/", label: "Scenarios", icon: "📋" },
  { href: "/sessions", label: "Sessions", icon: "🎙️" },
  { href: "/results", label: "Results", icon: "📊" },
];

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: "📈" },
  { href: "/admin/scenarios", label: "Manage Scenarios", icon: "⚙️" },
  { href: "/admin/agents", label: "Agent Performance", icon: "👥" },
];

export function NavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const navItems = isAdmin ? adminNavItems : agentNavItems;

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">CAT</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Admin Panel" : "Collection Agent Trainer"}
          </p>
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

        {/* Role switcher */}
        <div className="p-4 border-t border-border">
          <Link
            href={isAdmin ? "/" : "/admin"}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <span aria-hidden="true">{isAdmin ? "🎙️" : "🔒"}</span>
            {isAdmin ? "Switch to Agent" : "Switch to Admin"}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
