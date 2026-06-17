"use client";

import Link from "next/link";
import { useScenarios } from "@/hooks/use-scenarios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function ScenarioCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border py-6 shadow-sm animate-pulse">
      <div className="px-6 space-y-3">
        <div className="h-5 w-3/4 bg-muted rounded" />
        <div className="h-4 w-1/3 bg-muted rounded" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: scenarios, isLoading, isError, error, refetch } = useScenarios();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Training Scenarios</h2>
          <p className="text-muted-foreground mt-2">
            Select a scenario to begin a training session.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ScenarioCardSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium">
              Failed to load scenarios
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && scenarios?.length === 0 && (
          <div className="rounded-lg border border-border p-6 text-center">
            <p className="text-muted-foreground">
              No scenarios available
            </p>
          </div>
        )}

        {!isLoading && !isError && scenarios && scenarios.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((scenario) => (
              <Link
                key={scenario.id}
                href={`/scenarios/${scenario.id}`}
                className="block transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>{scenario.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {scenario.scenario_type.replace(/_/g, " ").toLowerCase()}
                    </CardDescription>
                  </CardHeader>
                  {scenario.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {scenario.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
