import { Check } from "lucide-react";

import { PageEmpty } from "@/components/page-empty";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentCampaignWithProgress } from "@/types/campaign-selection";

const MAX_DESCRIPTION_LENGTH = 120;

interface CampaignListProps {
  campaigns: AgentCampaignWithProgress[];
  onSelectCampaign: (campaign: AgentCampaignWithProgress) => void;
}

export function truncateDescription(description: string | null): string {
  if (!description) {
    return "No description provided.";
  }

  if (description.length <= MAX_DESCRIPTION_LENGTH) {
    return description;
  }

  return `${description.slice(0, MAX_DESCRIPTION_LENGTH)}…`;
}

function getProgressPercentage(campaign: AgentCampaignWithProgress): number {
  if (campaign.total_scenarios === 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((campaign.accomplished_scenarios / campaign.total_scenarios) * 100),
  );
}

function CampaignCard({ campaign, onSelect }: {
  campaign: AgentCampaignWithProgress;
  onSelect: () => void;
}) {
  const progressPercentage = getProgressPercentage(campaign);

  return (
    <Card className="relative h-full transition-colors hover:border-primary">
      <button
        type="button"
        onClick={onSelect}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Select campaign ${campaign.name}`}
      />
      <CardHeader className="pointer-events-none">
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{campaign.name}</CardTitle>
          {campaign.is_completed && (
            <Badge variant="success">
              <Check aria-hidden="true" />
              Completed
            </Badge>
          )}
        </div>
        <CardDescription>{truncateDescription(campaign.description)}</CardDescription>
      </CardHeader>
      <CardContent className="pointer-events-none">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {campaign.accomplished_scenarios}/{campaign.total_scenarios} scenarios completed
            </span>
            <span className="font-medium text-foreground">{progressPercentage}%</span>
          </div>
          <progress
            className="h-2 w-full overflow-hidden rounded-full bg-muted accent-primary"
            aria-label={`${campaign.name} progress`}
            value={progressPercentage}
            max={100}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function CampaignList({ campaigns, onSelectCampaign }: CampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <PageEmpty
        title="No active campaigns"
        description="You do not have any active campaigns available right now."
      />
    );
  }

  return (
    <section aria-labelledby="campaign-list-heading">
      <h2 id="campaign-list-heading" className="sr-only">
        Active campaigns
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onSelect={() => onSelectCampaign(campaign)}
          />
        ))}
      </div>
    </section>
  );
}
