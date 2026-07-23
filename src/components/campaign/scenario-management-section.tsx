"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CreateScenarioDialog } from "@/components/campaign/create-scenario-dialog";
import { ScenarioPickerDialog } from "@/components/campaign/scenario-picker-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useRemoveCampaignScenario } from "@/hooks/use-campaign-scenarios";
import type { CampaignScenarioItem } from "@/lib/api/campaigns";

interface ScenarioManagementSectionProps {
  campaignId: string;
  scenarios: CampaignScenarioItem[];
  campaignStatus: string;
}

interface Notification {
  type: "success" | "error" | "info";
  message: string;
}

function formatScenarioType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function truncateName(name: string, maxLength = 80): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "...";
}

export function ScenarioManagementSection({
  campaignId,
  scenarios,
  campaignStatus,
}: ScenarioManagementSectionProps) {
  const [showPickerDialog, setShowPickerDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  const queryClient = useQueryClient();
  const removeMutation = useRemoveCampaignScenario(campaignId);

  const scenarioToRemove = scenarios.find((s) => s.id === confirmRemoveId);

  const sortedScenarios = [...scenarios].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleRemoveConfirm = useCallback(() => {
    if (!confirmRemoveId) return;

    removeMutation.mutate(confirmRemoveId, {
      onSuccess: () => {
        setNotification({ type: "success", message: "Scenario removed successfully." });
        setConfirmRemoveId(null);
        queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      },
      onError: (error: Error) => {
        setConfirmRemoveId(null);
        if (error.message.includes("not associated") || error.message.includes("not assigned")) {
          setNotification({
            type: "info",
            message: "Scenario was already removed. Refreshing list.",
          });
          queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
        } else {
          setNotification({ type: "error", message: "Failed to remove scenario. Please try again." });
        }
      },
    });
  }, [confirmRemoveId, removeMutation, queryClient, campaignId]);

  return (
    <section aria-labelledby="scenario-section-heading">
      {/* Notification banner */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`mb-4 rounded-md px-4 py-3 text-sm ${
            notification.type === "success"
              ? "bg-success-muted text-success-foreground"
              : notification.type === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-secondary-foreground"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 id="scenario-section-heading" className="text-lg font-semibold text-foreground">
            Scenarios
          </h2>
          <Badge variant="outline">{scenarios.length}</Badge>
        </div>
        {campaignStatus !== "archived" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPickerDialog(true)}
              aria-label="Add existing scenarios to campaign"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Existing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              aria-label="Create custom scenario for campaign"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Custom
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {scenarios.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">
              No scenarios are currently assigned. Scenarios can be added by editing the campaign.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 space-y-2">
          {sortedScenarios.map((scenario) => (
            <Card key={scenario.id}>
              <CardContent className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="truncate text-sm font-medium text-foreground">
                    {truncateName(scenario.name)}
                  </span>
                  <Badge variant="default">{formatScenarioType(scenario.scenario_type)}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRemoveId(scenario.id)}
                  disabled={removeMutation.isPending && removeMutation.variables === scenario.id}
                  aria-label={`Remove scenario ${scenario.name}`}
                >
                  {removeMutation.isPending && removeMutation.variables === scenario.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!confirmRemoveId} onOpenChange={(open) => !open && setConfirmRemoveId(null)}>
        <DialogContent className="z-[301] max-w-sm" backdropClassName="z-[300]">
          <DialogHeader>
            <DialogTitle>Remove Scenario</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &ldquo;{scenarioToRemove?.name}&rdquo; from this
              campaign?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm">Cancel</Button>} />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveConfirm}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Removing...
                </span>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scenario Picker Dialog */}
      <ScenarioPickerDialog
        open={showPickerDialog}
        onOpenChange={setShowPickerDialog}
        campaignId={campaignId}
        existingScenarioIds={scenarios.map((s) => s.id)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
          setNotification({ type: "success", message: "Scenarios added successfully." });
        }}
      />

      {/* Create Scenario Dialog */}
      <CreateScenarioDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        campaignId={campaignId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
          setNotification({ type: "success", message: "Custom scenario created and added successfully." });
        }}
      />
    </section>
  );
}
