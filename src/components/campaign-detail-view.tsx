"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCampaign } from "@/hooks/use-campaigns";
import { Loader2 } from "lucide-react";

interface CampaignDetailViewProps {
  campaignId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}

function statusBadgeVariant(status: string) {
  if (status === "active") return "success" as const;
  return "default" as const;
}

export function CampaignDetailView({ campaignId, onClose, onEdit }: CampaignDetailViewProps) {
  const {
    data: campaign,
    isLoading,
    isError,
    refetch,
  } = useCampaign(campaignId ?? "");

  return (
    <Dialog open={!!campaignId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="z-[301] max-w-lg" backdropClassName="z-[300]">
        <DialogHeader>
          <DialogTitle>Campaign Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Failed to load campaign details.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : campaign ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Name</p>
              <p className="text-sm text-foreground">{campaign.name}</p>
            </div>

            {campaign.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-sm text-foreground">{campaign.description}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <Badge variant={statusBadgeVariant(campaign.status)}>
                {campaign.status}
              </Badge>
            </div>

            {campaign.start_date && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Start Date</p>
                <p className="text-sm text-foreground">{campaign.start_date}</p>
              </div>
            )}

            {campaign.end_date && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">End Date</p>
                <p className="text-sm text-foreground">{campaign.end_date}</p>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Agents</p>
              {campaign.agents.length > 0 ? (
                <div className="space-y-1">
                  {campaign.agents.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded border border-border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.full_name}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                      <Badge variant="default">{a.role}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No agents assigned</p>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm">Close</Button>} />
          {campaign && (
            <Button
              size="sm"
              onClick={() => {
                if (campaignId) {
                  onEdit(campaignId);
                }
              }}
            >
              Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
