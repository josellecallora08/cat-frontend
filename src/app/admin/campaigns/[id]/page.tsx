"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useState } from "react";

import type { AgentOption, AgentWithRole } from "@/components/agent-dropdown";
import { AgentDropdown } from "@/components/agent-dropdown";
import { CampaignDashboard } from "@/components/campaign-dashboard";
import { ScenarioManagementSection } from "@/components/campaign/scenario-management-section";
import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
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
import { Select } from "@/components/ui/select";
import { useCampaign, useUpdateCampaign } from "@/hooks/use-campaigns";
import type { CampaignUpdatePayload } from "@/lib/api/campaigns";
import { useAuthStore } from "@/stores/auth-store";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

function statusBadgeVariant(status: string) {
  if (status === "active") return "success" as const;
  return "default" as const;
}

function formatDateRange(
  startDate: string | null,
  endDate: string | null
): string | null {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  const start = startDate
    ? new Date(startDate).toLocaleDateString("en-US", options)
    : null;
  const end = endDate
    ? new Date(endDate).toLocaleDateString("en-US", options)
    : null;

  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return null;
}

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: campaign, isLoading, isError, refetch } = useCampaign(id);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "draft",
    agents: [] as AgentWithRole[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState("draft");

  const token = useAuthStore((s) => s.token);
  const updateMutation = useUpdateCampaign();
  const queryClient = useQueryClient();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  const { data: allAgents } = useQuery<AgentOption[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token && showEditDialog,
  });

  const openEditDialog = useCallback(() => {
    if (!campaign) return;
    setEditingStatus(campaign.status);
    setFormData({
      name: campaign.name,
      description: campaign.description ?? "",
      status: campaign.status,
      agents: campaign.agents.map((a) => ({
        id: a.id,
        full_name: a.full_name,
        email: a.email,
        role: a.role as AgentWithRole["role"],
      })),
    });
    setFormErrors({});
    setSubmitError(null);
    setShowEditDialog(true);
  }, [campaign]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (formData.name.length > 100)
      errors.name = "Name must be 100 characters or less";
    if (formData.agents.length === 0)
      errors.agents = "Select at least one agent";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitError(null);
    try {
      const payload: CampaignUpdatePayload = {
        name: formData.name,
        description: formData.description || null,
        ...(formData.status !== editingStatus ? { status: formData.status } : {}),
        agents: formData.agents.map((a) => ({ agent_id: a.id, role: a.role })),
      };
      await updateMutation.mutateAsync({ id, data: payload });
      setShowEditDialog(false);
      queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      if (message.includes("409")) {
        setSubmitError("Campaign name is already in use");
      } else {
        setSubmitError("Could not save campaign. Please try again.");
      }
    }
  };

  if (isLoading) {
    return (
      <PageContent>
        <PageSkeleton variant="detail" />
      </PageContent>
    );
  }

  if (isError) {
    return (
      <PageContent>
        <PageError title="Failed to load campaign" onRetry={refetch} />
      </PageContent>
    );
  }

  if (!campaign) {
    return (
      <PageContent>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Campaign not found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The campaign you are looking for does not exist or has been removed.
          </p>
          <Link
            href="/admin/campaigns"
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Back to campaigns
          </Link>
        </div>
      </PageContent>
    );
  }

  const dateRange = formatDateRange(campaign.start_date, campaign.end_date);

  return (
    <PageContent>
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/admin/campaigns")}
        aria-label="Go back to campaigns list"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Campaigns
      </Button>

      {/* Campaign Header */}
      <PageHeader
        title={campaign.name}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant={statusBadgeVariant(campaign.status)}
              className="capitalize"
            >
              {campaign.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={openEditDialog}
              aria-label="Edit campaign"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          </div>
        }
      />

      {/* Description and date range */}
      {(campaign.description || dateRange) && (
        <div className="space-y-1">
          {campaign.description && (
            <p className="text-sm text-muted-foreground">
              {campaign.description}
            </p>
          )}
          {dateRange && (
            <p className="text-xs text-muted-foreground">{dateRange}</p>
          )}
        </div>
      )}

      {/* Dashboard Metrics Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Target
                className="h-5 w-5 text-secondary-foreground"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Scenarios
              </p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {campaign.scenarios.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <TrendingUp
                className="h-5 w-5 text-secondary-foreground"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Campaign Status
              </p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight capitalize text-foreground">
                {campaign.status}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Dashboard */}
      <CampaignDashboard campaignId={id} />

      {/* Scenario Management */}
      <ScenarioManagementSection
        campaignId={id}
        scenarios={campaign.scenarios}
        campaignStatus={campaign.status}
      />

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="z-[301] max-w-lg" backdropClassName="z-[300]">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update the campaign details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Campaign name"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Status</label>
              <div className="mt-1">
                <Select
                  value={formData.status}
                  onChange={(value) => setFormData((p) => ({ ...p, status: value }))}
                  options={STATUS_OPTIONS}
                  ariaLabel="Campaign status"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Agents <span className="text-destructive">*</span>
              </label>
              <div className="mt-1">
                <AgentDropdown
                  agents={allAgents ?? []}
                  selectedAgents={formData.agents}
                  onChange={(newAgents) => setFormData((p) => ({ ...p, agents: newAgents }))}
                />
              </div>
              {formErrors.agents && (
                <p className="mt-1 text-xs text-destructive">{formErrors.agents}</p>
              )}
            </div>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm">Cancel</Button>} />
            <Button size="sm" onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </span>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}

export { formatDateRange };

