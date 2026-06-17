"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useScenarios } from "@/hooks/use-scenarios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  HeartCrack,
  Flame,
  CalendarClock,
  Scale,
  Inbox,
  AlertCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

type TypeMeta = { icon: LucideIcon; label: string };

const typeMeta: Record<string, TypeMeta> = {
  FINANCIAL_HARDSHIP: { icon: HeartCrack, label: "Financial Hardship" },
  ANGRY_CUSTOMER: { icon: Flame, label: "Angry Customer" },
  PAYMENT_EXTENSION: { icon: CalendarClock, label: "Payment Extension" },
  BALANCE_DISPUTE: { icon: Scale, label: "Balance Dispute" },
};

const fallbackMeta: TypeMeta = { icon: Inbox, label: "Scenario" };

const filters = [
  { value: "ALL", label: "All" },
  { value: "FINANCIAL_HARDSHIP", label: "Financial Hardship" },
  { value: "ANGRY_CUSTOMER", label: "Angry Customer" },
  { value: "PAYMENT_EXTENSION", label: "Payment Extension" },
  { value: "BALANCE_DISPUTE", label: "Balance Dispute" },
];

function ScenarioCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
      <div className="mt-4 h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-1.5 h-4 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function ScenariosPage() {
  const { data: scenarios, isLoading, isError, error, refetch } = useScenarios();
  const [activeFilter, setActiveFilter] = useState("ALL");

  const visible = useMemo(() => {
    if (!scenarios) return [];
    if (activeFilter === "ALL") return scenarios;
    return scenarios.filter((s) => s.scenario_type === activeFilter);
  }, [scenarios, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <header className="space-y-1">
        <h1 className="text-2xl font-medium leading-tight text-foreground">
          Training Scenarios
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Choose a scenario to start a live, AI-powered practice call.
        </p>
      </header>

      {/* Filter tabs (pill variant) */}
      {!isError && (
        <div
          role="tablist"
          aria-label="Filter scenarios by type"
          className="flex flex-wrap items-center gap-1.5 border-b border-border pb-4"
        >
          {filters.map((f) => {
            const active = activeFilter === f.value;
            return (
              <button
                key={f.value}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveFilter(f.value)}
                className={cn(
                  "min-h-9 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ScenarioCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div
          role="alert"
          className="flex flex-col items-center rounded-lg border border-border bg-card px-6 py-12 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-medium text-foreground">
            Couldn&apos;t load scenarios
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && visible.length === 0 && (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Inbox className="h-6 w-6 text-secondary-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-medium text-foreground">
            {activeFilter === "ALL"
              ? "No scenarios available"
              : "No scenarios in this category"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {activeFilter === "ALL"
              ? "Scenarios are added by your administrator. Check back soon."
              : "Try a different category or view all scenarios."}
          </p>
          {activeFilter !== "ALL" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setActiveFilter("ALL")}
            >
              View all
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((scenario) => {
            const meta = typeMeta[scenario.scenario_type] ?? fallbackMeta;
            const Icon = meta.icon;
            return (
              <Link
                key={scenario.id}
                href={`/scenarios/${scenario.id}`}
                aria-label={`Start training: ${scenario.name}`}
                className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <article className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors duration-100 group-hover:bg-muted">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <Icon
                      className="h-5 w-5 text-secondary-foreground"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="mt-4">
                    <Badge>{meta.label}</Badge>
                  </div>

                  <h2 className="mt-2 text-lg font-medium leading-tight text-foreground">
                    {scenario.name}
                  </h2>

                  {scenario.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {scenario.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center pt-5">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      Start training
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-100 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
