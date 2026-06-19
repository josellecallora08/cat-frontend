"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore, type UserRole } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Shield, Headphones, Loader2, AlertCircle } from "lucide-react";
import catsLogo from "@/assets/CATS-SIDEBAR-LOGO.svg";

type AuthMode = "select" | "login" | "register";

const roles: { value: UserRole; label: string; description: string; icon: typeof Shield }[] = [
  {
    value: "admin",
    label: "Administrator",
    description: "Manage scenarios, view dashboards, and monitor agent performance",
    icon: Shield,
  },
  {
    value: "agent",
    label: "Collection Agent",
    description: "Practice calls with AI debtors and receive performance feedback",
    icon: Headphones,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, register, isLoading, error } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>("select");
  const [selectedRole, setSelectedRole] = useState<UserRole>("agent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setMode("login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      await register(email, password, fullName, selectedRole);
    } else {
      await login(email, password);
    }

    // Check if login succeeded (store will have user)
    const { user } = useAuthStore.getState();
    if (user) {
      router.push("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      {/* Background gradient (matches app body) */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(60rem 60rem at 12% -10%, rgba(142, 105, 224, 0.06), transparent 60%)",
            "radial-gradient(50rem 50rem at 100% 0%, rgba(179, 59, 196, 0.05), transparent 55%)",
            "radial-gradient(50rem 50rem at 90% 110%, rgba(98, 120, 209, 0.04), transparent 55%)",
          ].join(", "),
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <Image
            src={catsLogo}
            alt="CATS - Collection Agent Trainer System"
            className="h-12 w-auto"
            priority
          />
          <p className="mt-3 text-sm text-muted-foreground">
            AI-powered collection agent training
          </p>
        </div>

        {/* Role Selection */}
        {mode === "select" && (
          <div className="space-y-4">
            <h1 className="text-center text-lg font-medium text-foreground">
              Choose your role
            </h1>
            <div className="space-y-3">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.value}
                    onClick={() => handleRoleSelect(role.value)}
                    className="group flex w-full items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-5 w-5 text-secondary-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{role.label}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Login / Register Form */}
        {mode === "login" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-lg font-medium text-foreground">
                {isRegister ? "Create an account" : "Sign in"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isRegister
                  ? `Register as ${selectedRole === "admin" ? "an administrator" : "a collection agent"}`
                  : `Sign in as ${selectedRole === "admin" ? "an administrator" : "a collection agent"}`}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isLoading}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {isRegister ? "Creating account..." : "Signing in..."}
                  </span>
                ) : isRegister ? (
                  "Create account"
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="space-y-3 text-center">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {isRegister ? "Already have an account? Sign in" : "Don't have an account? Register"}
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("select");
                    setEmail("");
                    setPassword("");
                    setFullName("");
                    useAuthStore.setState({ error: null });
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Choose a different role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
