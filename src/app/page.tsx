"use client";

import Link from "next/link";
import { useScenarios } from "@/hooks/use-scenarios";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HeartCrack,
  Flame,
  CalendarClock,
  Scale,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// Visual config per scenario type — colors drawn from the Kiro palette.
const typeConfig: Record<
  string,
  { icon: typeof HeartCrack; gradient: string; glow: string; label: string }
> = {
  FINANCIAL_HARDSHIP: {
    icon: HeartCrack,
    gradient: "from-[#6278d1] to-[#222d83]",
    glow: "group-hover:shadow-[#6278d1]/30",
    label: "Financial Hardship",
  },
  ANGRY_CUSTOMER: {
    icon: Flame,
    gradient: "from-[#b33bc4] to-[#51165a]",
    glow: "group-hover:shadow-[#b33bc4]/30",
    label: "Angry Customer",
  },
  PAYMENT_EXTENSION: {
    icon: CalendarClock,
    gradient: "from-[#8e69e0] to-[#472481]",
    glow: "group-hover:shadow-[#8e69e0]/30",
    label: "Payment Extension",
  },
  BALANCE_DISPUTE: {
    icon: Scale,
    gradient: "from-[#e9a3f3] to-[#b33bc4]",
    glow: "group-hover:shadow-[#e9a3f3]/30",
    label: "Balance Dispute",
  },
};

const fallbackConfig = {
  icon: Sparkles,
  gradient: "from-[#8e69e0] to-[#222d83]",
  glow: "group-hover:shadow-[#8e69e0]/30",
  label: "Scenario",
};

function ScenarioCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm animate-pulse">
      <div className="h-12 w-12 rounded-xl bg-muted" />
      <div className="mt-5 h-5 w-3/4 rounded bg-muted" />
      <div className="mt-3 h-4 w-1/3 rounded bg-muted" />
      <div className="mt-4 h-4 w-full rounded bg-muted/70" />
    </div>
  );
}

export default function HomePage() {
  const { data: scenarios, isLoading, isError, error, refetch } = useScenarios();

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#271d40] via-[#1c1430] to-[#18122b] p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#b33bc4]/20 blur-3xl" />
        <div className="absolute -bottom-20 right-32 h-56 w-56 rounded-full bg-[#6278d1]/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-[#e9a3f3]">
              <Sparkles className="h-3.5 w-3.5" /> Collection Agent Trainer
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
              Training Scenarios
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Pick a realistic debtor scenario and sharpen your collection
              skills through live, AI-powered conversations.
            </p>
          </div>
          <Link href="/scenarios/create">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-[#b33bc4] text-white shadow-lg shadow-primary/30 hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" /> Create Scenario
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div>
        {isLoading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ScenarioCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center">
            <p className="font-medium text-destructive">Failed to load scenarios</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && scenarios?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#b33bc4] text-white shadow-lg shadow-primary/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="mt-4 font-medium text-foreground">No scenarios yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate your first training scenario to get started.
            </p>
            <Link href="/scenarios/create" className="mt-5 inline-block">
              <Button className="bg-gradient-to-r from-primary to-[#b33bc4] text-white">
                Create Scenario
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && !isError && scenarios && scenarios.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((scenario) => {
              const config = typeConfig[scenario.scenario_type] ?? fallbackConfig;
              const Icon = config.icon;
              return (
                <Link
                  key={scenario.id}
                  href={`/scenarios/${scenario.id}`}
                  className="group focus-visible:outline-none"
                >
                  <article
                    className={cn(
                      "relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-sm transition-all duration-300",
                      "hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl",
                      config.glow
                    )}
                  >
                    {/* subtle corner glow */}
                    <div
                      className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${config.gradient} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40`}
                    />

                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <span className="mt-4 inline-flex w-fit items-center rounded-full bg-accent/60 px-2.5 py-0.5 text-[11px] font-medium text-[#cec4f2]">
                      {config.label}
                    </span>

                    <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground">
                      {scenario.name}
                    </h3>

                    {scenario.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        {scenario.description}
                      </p>
                    )}

                    <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Start training
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
