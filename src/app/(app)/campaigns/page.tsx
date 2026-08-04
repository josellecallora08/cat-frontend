"use client";

import { useEffect } from "react";

import { CampaignList } from "@/components/campaigns/campaign-list";
import {
    CampaignScenarioList,
    type ScenarioSelection,
} from "@/components/campaigns/campaign-scenario-list";
import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { useAgentCampaigns } from "@/hooks/use-agent-campaigns";
import { useCampaignProgress } from "@/hooks/use-campaign-progress";
import { useCampaignSelectionStore } from "@/stores/campaign-selection-store";
import { useSessionStore } from "@/stores/session-store";
import type { AgentCampaignWithProgress } from "@/types/campaign-selection";

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading, isError, refetch } = useAgentCampaigns();
  const selectedCampaignId = useCampaignSelectionStore((state) => state.selectedCampaignId);
  const selectCampaign = useCampaignSelectionStore((state) => state.selectCampaign);
  const clearSelection = useCampaignSelectionStore((state) => state.clearSelection);
  const createSession = useSessionStore((state) => state.createSession);
  const selectedCampaign = campaigns.find(({ id }) => id === selectedCampaignId) ?? null;
  const progressQuery = useCampaignProgress(selectedCampaignId);

  useEffect(() => {
    if (campaigns.length === 1 && selectedCampaignId !== campaigns[0]?.id) {
      selectCampaign(campaigns[0].id);
    }
    if (campaigns.length !== 1 && selectedCampaignId && !selectedCampaign) {
      clearSelection();
    }
  }, [campaigns, selectedCampaign, selectedCampaignId, selectCampaign, clearSelection]);

  const handleCampaignSelect = (campaign: AgentCampaignWithProgress) => {
    selectCampaign(campaign.id);
  };

  const handleScenarioSelect = async ({ scenario_id, campaign_id }: ScenarioSelection) => {
    await createSession(scenario_id, campaign_id);
  };

  if (isLoading) {
    return (
      <PageContent>
        <PageHeader title="Campaigns" subtitle="Choose a campaign to start training." />
        <PageSkeleton variant="cards" count={3} />
      </PageContent>
    );
  }

  if (isError) {
    return (
      <PageContent>
        <PageHeader title="Campaigns" subtitle="Choose a campaign to start training." />
        <PageError
          title="Couldn’t load campaigns"
          message="Campaign and progress data could not be loaded. Please try again."
          onRetry={() => void refetch()}
        />
      </PageContent>
    );
  }

  if (!selectedCampaign) {
    return (
      <PageContent>
        <PageHeader
          title="Campaigns"
          subtitle="Choose a campaign to see its training scenarios and progress."
        />
        <CampaignList campaigns={campaigns} onSelectCampaign={handleCampaignSelect} />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <PageHeader
        title={selectedCampaign.name}
        subtitle="Choose any scenario to start a training session."
      />
      {progressQuery.isLoading ? (
        <PageSkeleton variant="list" count={4} />
      ) : progressQuery.isError || !progressQuery.data ? (
        <PageError
          title="Couldn’t load campaign progress"
          message="Progress data could not be loaded. Please try again."
          onRetry={() => void progressQuery.refetch()}
        />
      ) : (
        <CampaignScenarioList
          campaignId={selectedCampaign.id}
          scenarios={progressQuery.data.scenarios}
          isCompleted={progressQuery.data.is_completed}
          onScenarioSelect={handleScenarioSelect}
        />
      )}
    </PageContent>
  );
}
