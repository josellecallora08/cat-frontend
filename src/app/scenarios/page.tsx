"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useScenarios } from "@/hooks/use-scenarios";
import { useAuthStore } from "@/stores/auth-store";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  HeartCrack,
  Flame,
  CalendarClock,
  Scale,
  Inbox,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  Trash2,
  type LucideIcon,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type TypeMeta = { icon: LucideIcon; label: string };

const typeMeta: Record<string, TypeMeta> = {
  FINANCIAL_HARDSHIP: { icon: HeartCrack, label: "Financial Hardship" },
  ANGRY_CUSTOMER: { icon: Flame, label: "Angry Customer" },
  PAYMENT_EXTENSION: { icon: CalendarClock, label: "Payment Extension" },
  BALANCE_DISPUTE: { icon: Scale, label: "Balance Dispute" },
};

const fallbackMeta: TypeMeta = { icon: Inbox, label: "Scenario" };

const SCENARIO_TYPES = [
  { value: "FINANCIAL_HARDSHIP", label: "Financial Hardship" },
  { value: "ANGRY_CUSTOMER", label: "Angry Customer" },
  { value: "PAYMENT_EXTENSION", label: "Payment Extension" },
  { value: "BALANCE_DISPUTE", label: "Balance Dispute" },
];

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

async function generateScenario(prompt: string, scenarioType: string, token: string) {
  const res = await fetch(`${API_BASE_URL}/api/scenarios/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, scenario_type: scenarioType }),
  });
  if (!res.ok) throw new Error("Generation failed");
  return res.json();
}

async function deleteScenario(id: string, token: string) {
  const res = await fetch(`${API_BASE_URL}/api/scenarios/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete");
}

export default function ScenariosPage() {
  const { data: scenarios, isLoading, isError, error, refetch } = useScenarios();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token) ?? "";
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [showGenerate, setShowGenerate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Generate form state
  const [genForm, setGenForm] = useState({
    debtorName: "",
    gender: "female",
    amount: "",
    daysPastDue: "30",
    scenarioType: "FINANCIAL_HARDSHIP",
    situation: "",
    instructions: "",
  });

  const genMutation = useMutation({
    mutationFn: () => {
      const prompt = [
        `Debtor name: ${genForm.debtorName} (${genForm.gender})`,
        `Outstanding balance: ${genForm.amount} pesos`,
        `Days past due: ${genForm.daysPastDue}`,
        `Scenario type: ${SCENARIO_TYPES.find((t) => t.value === genForm.scenarioType)?.label}`,
        `Situation: ${genForm.situation}`,
        genForm.instructions ? `Special instructions: ${genForm.instructions}` : "",
      ]
        .filter(Boolean)
        .join(". ");
      return generateScenario(prompt, genForm.scenarioType, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      setShowGenerate(false);
      setGenForm({
        debtorName: "",
        gender: "female",
        amount: "",
        daysPastDue: "30",
        scenarioType: "FINANCIAL_HARDSHIP",
        situation: "",
        instructions: "",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScenario(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      setDeleteTarget(null);
    },
  });

  const visible = useMemo(() => {
    if (!scenarios) return [];
    if (activeFilter === "ALL") return scenarios;
    return scenarios.filter((s) => s.scenario_type === activeFilter);
  }, [scenarios, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium leading-tight text-foreground">
            Training Scenarios
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose a scenario to start a live, AI-powered practice call.
          </p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={() => setShowGenerate(true)}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Generate Scenario
          </Button>
        )}
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
              ? isAdmin
                ? "Generate your first scenario using AI."
                : "Scenarios are added by your administrator. Check back soon."
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
          {activeFilter === "ALL" && isAdmin && (
            <Button size="sm" className="mt-4" onClick={() => setShowGenerate(true)}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate Scenario
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((scenario) => {
            const meta = typeMeta[scenario.scenario_type] ?? fallbackMeta;
            return (
              <div key={scenario.id} className="relative group">
                <Link
                  href={`/scenarios/${scenario.id}`}
                  aria-label={`Start training: ${scenario.name}`}
                  className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 transition-all duration-150 group-hover:border-[#8F6AE0]/30 group-hover:shadow-md">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#8F6AE0]/10 px-3 py-1 text-xs font-semibold text-[#8F6AE0]">
                        {meta.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="mt-3 text-base font-bold leading-snug text-[#2B2339]">
                      {scenario.name}
                    </h2>

                    {/* Description — 1 line, truncate with ellipsis */}
                    <p className="mt-2 truncate text-sm text-muted-foreground">
                      {scenario.description ? scenario.description : `Practice handling a ${meta.label.toLowerCase()} scenario with an AI debtor`}
                    </p>

                    {/* Start practice button */}
                    <div className="mt-auto pt-5">
                      <span className="flex h-11 w-full items-center justify-center rounded-full border border-border bg-transparent text-sm font-semibold text-muted-foreground transition-all group-hover:border-[#8F6AE0] group-hover:bg-[#8F6AE0] group-hover:text-white group-hover:shadow-lg group-hover:shadow-[#8F6AE0]/20">
                        Start practice
                      </span>
                    </div>
                  </article>
                </Link>
                {/* Admin delete button */}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget({ id: scenario.id, name: scenario.name });
                    }}
                    aria-label={`Delete ${scenario.name}`}
                    className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete scenario?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be removed from the training list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm">Cancel</Button>} />
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Scenario Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate new scenario</DialogTitle>
            <DialogDescription>
              Describe the debtor and AI will generate a complete training scenario.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              genMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Debtor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Maria Santos"
                  value={genForm.debtorName}
                  onChange={(e) => setGenForm({ ...genForm, debtorName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={genMutation.isPending}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Gender</label>
                <select
                  value={genForm.gender}
                  onChange={(e) => setGenForm({ ...genForm, gender: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={genMutation.isPending}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (₱)</label>
                <input
                  type="number"
                  required
                  placeholder="50000"
                  value={genForm.amount}
                  onChange={(e) => setGenForm({ ...genForm, amount: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={genMutation.isPending}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Days Past Due</label>
                <input
                  type="number"
                  placeholder="45"
                  value={genForm.daysPastDue}
                  onChange={(e) => setGenForm({ ...genForm, daysPastDue: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={genMutation.isPending}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Scenario Type</label>
              <select
                value={genForm.scenarioType}
                onChange={(e) => setGenForm({ ...genForm, scenarioType: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={genMutation.isPending}
              >
                {SCENARIO_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Situation / Backstory</label>
              <textarea
                required
                placeholder="e.g., Nawalan ng work sa BPO. Single mother, very emotional when pressured..."
                value={genForm.situation}
                onChange={(e) => setGenForm({ ...genForm, situation: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground min-h-[80px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={genMutation.isPending}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Special Instructions (optional)</label>
              <textarea
                placeholder="e.g., Will hang up if agent raises voice. Agrees to pay if offered installment."
                value={genForm.instructions}
                onChange={(e) => setGenForm({ ...genForm, instructions: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground min-h-[60px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={genMutation.isPending}
              />
            </div>

            {genMutation.isError && (
              <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Failed to generate scenario. Check your API key.
              </div>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" size="sm">Cancel</Button>} />
              <Button type="submit" size="sm" disabled={genMutation.isPending}>
                {genMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Generate
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
