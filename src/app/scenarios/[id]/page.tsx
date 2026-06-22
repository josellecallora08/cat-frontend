"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useScenario } from "@/hooks/use-scenarios";
import { ScenarioIncompleteProfileError } from "@/lib/api/scenarios";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HeartCrack,
  Flame,
  CalendarClock,
  Scale,
  Inbox,
  ChevronRight,
  AlertCircle,
  Phone,
  Loader2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const typeMeta: Record<string, { icon: LucideIcon; label: string }> = {
  FINANCIAL_HARDSHIP: { icon: HeartCrack, label: "Financial Hardship" },
  ANGRY_CUSTOMER: { icon: Flame, label: "Angry Customer" },
  PAYMENT_EXTENSION: { icon: CalendarClock, label: "Payment Extension" },
  BALANCE_DISPUTE: { icon: Scale, label: "Balance Dispute" },
};
const fallbackMeta = { icon: Inbox, label: "Scenario" };

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link
            href="/"
            className="rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Scenarios
          </Link>
        </li>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <li className="font-medium text-foreground" aria-current="page">
          {name ?? "Loading…"}
        </li>
      </ol>
    </nav>
  );
}

function ScenarioDetailSkeleton() {
  return (
    <div>
      <div className="mb-6 h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="mt-4 h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-7 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
            </CardHeader>
          </Card>
          <Card>
            <CardContent className="space-y-4 pt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-9 w-full animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: scenario, isLoading, isError, error } = useScenario(id);
  const [starting, setStarting] = useState(false);

  if (isLoading) return <ScenarioDetailSkeleton />;

  if (isError) {
    const isIncompleteProfile = error instanceof ScenarioIncompleteProfileError;
    return (
      <div>
        <Breadcrumb name="Error" />
        <div
          role="alert"
          className="flex flex-col items-center rounded-lg border border-border bg-card px-6 py-12 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-base font-medium text-foreground">
            {isIncompleteProfile
              ? "This scenario is incomplete"
              : "Couldn't load scenario"}
          </h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred."}
          </p>
          <Link href="/">
            <Button variant="outline" size="sm" className="mt-4">
              Back to scenarios
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!scenario) return null;

  const { debtor_profile } = scenario;
  const meta = typeMeta[scenario.scenario_type] ?? fallbackMeta;
  const Icon = meta.icon;

  return (
    <div>
      <Breadcrumb name={scenario.name} />

      <div className="grid grid-cols-12 gap-6">
        {/* Main column */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Icon
                  className="h-5 w-5 text-secondary-foreground"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-4">
                <Badge>{meta.label}</Badge>
              </div>
              <h1 className="mt-2 text-2xl font-medium leading-tight text-foreground">
                {scenario.name}
              </h1>
              {scenario.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {scenario.description}
                </p>
              )}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium leading-tight text-foreground">
                Debtor profile
              </h2>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <div className="flex items-center justify-between py-3 first:pt-0">
                  <dt className="text-sm text-muted-foreground">Name</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {debtor_profile.name}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-muted-foreground">
                    Outstanding balance
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {formatCurrency(debtor_profile.outstanding_balance)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-muted-foreground">Days past due</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {debtor_profile.days_past_due} days
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-sm text-muted-foreground">Personality</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-foreground">
                    {debtor_profile.personality_profile}
                  </dd>
                </div>
                <div className="py-3 last:pb-0">
                  <dt className="text-sm text-muted-foreground">
                    Conversation goal
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-foreground">
                    {debtor_profile.conversation_goal}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Sticky action rail */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="lg:sticky lg:top-20">
            <CardContent className="space-y-5 pt-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  Outstanding balance
                </p>
                <p className="mt-1 text-2xl font-semibold leading-tight text-foreground">
                  {formatCurrency(debtor_profile.outstanding_balance)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {debtor_profile.days_past_due} days past due
                </p>
              </div>

              <div className="border-t border-border pt-5">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={starting}
                  onClick={() => {
                    setStarting(true);
                    router.push(
                      `/sessions/new?scenario_id=${scenario.id}&debtor_name=${encodeURIComponent(debtor_profile.name)}`
                    );
                  }}
                >
                  {starting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Starting call…
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      Start call
                    </>
                  )}
                </Button>
                <Link href="/" className="mt-2 block">
                  <Button variant="outline" size="lg" className="w-full" disabled={starting}>
                    Back to scenarios
                  </Button>
                </Link>

                {/* Training simulator note */}
                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>This is a training simulator. No real calls will be made.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
