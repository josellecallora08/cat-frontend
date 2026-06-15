"use client";

import { use } from "react";
import Link from "next/link";
import { useScenario } from "@/hooks/use-scenarios";
import { ScenarioIncompleteProfileError } from "@/lib/api/scenarios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ScenarioDetailSkeleton() {
  return (
    <div className="max-w-2xl">
      <div className="h-4 w-24 bg-muted rounded mb-6 animate-pulse" />
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-2/3 bg-muted rounded" />
          <div className="h-4 w-1/3 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="h-4 w-2/3 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: scenario, isLoading, isError, error } = useScenario(id);

  if (isLoading) {
    return <ScenarioDetailSkeleton />;
  }

  if (isError) {
    const isIncompleteProfile =
      error instanceof ScenarioIncompleteProfileError;

    return (
      <div className="max-w-2xl">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">
            {isIncompleteProfile
              ? "Incomplete Scenario Profile"
              : "Failed to load scenario"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred"}
          </p>
          <Link href="/">
            <Button variant="outline" size="sm" className="mt-4">
              Back to Scenarios
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return null;
  }

  const { debtor_profile } = scenario;

  return (
    <div className="max-w-2xl">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-6"
      >
        ← Back to Scenarios
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{scenario.name}</CardTitle>
          <CardDescription className="capitalize">
            {scenario.scenario_type.replace(/_/g, " ").toLowerCase()}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {scenario.description && (
            <p className="text-sm text-muted-foreground mb-6">
              {scenario.description}
            </p>
          )}

          <h3 className="text-sm font-semibold text-foreground mb-4">
            Debtor Profile
          </h3>

          <dl className="grid gap-3">
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-sm text-muted-foreground">Name</dt>
              <dd className="text-sm font-medium">{debtor_profile.name}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-sm text-muted-foreground">
                Outstanding Balance
              </dt>
              <dd className="text-sm font-medium">
                {formatCurrency(debtor_profile.outstanding_balance)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-sm text-muted-foreground">Days Past Due</dt>
              <dd className="text-sm font-medium">
                {debtor_profile.days_past_due} days
              </dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-sm text-muted-foreground">Personality</dt>
              <dd className="text-sm font-medium text-right max-w-[60%]">
                {debtor_profile.personality_profile}
              </dd>
            </div>
            <div className="flex justify-between pb-2">
              <dt className="text-sm text-muted-foreground">
                Conversation Goal
              </dt>
              <dd className="text-sm font-medium text-right max-w-[60%]">
                {debtor_profile.conversation_goal}
              </dd>
            </div>
          </dl>
        </CardContent>

        <CardFooter>
          <Link href={`/sessions/new?scenario_id=${scenario.id}`}>
            <Button>Start Call</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
