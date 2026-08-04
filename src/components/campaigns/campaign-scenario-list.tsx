import { CheckCircle2, Play, Trophy } from "lucide-react";

import { PageEmpty } from "@/components/page-empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScenarioProgressItem } from "@/types/campaign-selection";

export interface ScenarioSelection {
  scenario_id: string;
  campaign_id: string;
}

interface CampaignScenarioListProps {
  campaignId: string;
  scenarios: ScenarioProgressItem[];
  isCompleted?: boolean;
  onScenarioSelect: (selection: ScenarioSelection) => void;
}

function formatScenarioType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function sortScenarios(scenarios: ScenarioProgressItem[]): ScenarioProgressItem[] {
  return [...scenarios].sort((first, second) => {
    const nameOrder = first.scenario_name.localeCompare(second.scenario_name, undefined, {
      sensitivity: "base",
    });
    return nameOrder || first.scenario_id.localeCompare(second.scenario_id);
  });
}

export function CampaignScenarioList({
  campaignId,
  scenarios,
  isCompleted = false,
  onScenarioSelect,
}: CampaignScenarioListProps) {
  const sortedScenarios = sortScenarios(scenarios);

  if (scenarios.length === 0) {
    return (
      <PageEmpty
        icon={Play}
        title="No scenarios available"
        description="There are no scenarios assigned to this campaign yet."
      />
    );
  }

  return (
    <section aria-labelledby="campaign-scenarios-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 id="campaign-scenarios-heading" className="text-lg font-semibold text-foreground">
            Scenarios
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose any scenario to start a training session.
          </p>
        </div>
        {isCompleted && (
          <Badge variant="success" className="gap-1.5">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            Campaign completed
          </Badge>
        )}
      </div>

      <ul className="space-y-2" aria-label="Campaign scenarios">
        {sortedScenarios.map((scenario) => (
          <li key={scenario.scenario_id}>
            <Card
              className={cn(
                "transition-colors hover:border-primary/50",
                scenario.accomplished && "opacity-70",
              )}
            >
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    scenario.accomplished ? "bg-success-muted" : "bg-primary/10",
                  )}
                  aria-hidden="true"
                >
                  {scenario.accomplished ? (
                    <CheckCircle2 className="h-5 w-5 text-success-foreground" />
                  ) : (
                    <Play className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {scenario.scenario_name}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {formatScenarioType(scenario.scenario_type)}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant={scenario.accomplished ? "outline" : "default"}
                  size="sm"
                  className="min-h-11 min-w-11"
                  onClick={() =>
                    onScenarioSelect({
                      scenario_id: scenario.scenario_id,
                      campaign_id: campaignId,
                    })
                  }
                  aria-label={`${scenario.accomplished ? "Re-practice" : "Start"} ${scenario.scenario_name}`}
                >
                  {scenario.accomplished ? "Re-practice" : "Start"}
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
