"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { AgentOption, AgentWithRole } from "@/components/agent-dropdown";
import { AgentDropdown } from "@/components/agent-dropdown";
import { FilterTabs } from "@/components/filter-tabs";
import { PageContent } from "@/components/page-content";
import { PageEmpty } from "@/components/page-empty";
import { PageHeader } from "@/components/page-header";
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
import {
    useCampaign,
    useCampaigns,
    useCreateCampaign,
    useDeleteCampaign,
    useUpdateCampaign,
} from "@/hooks/use-campaigns";
import type {
    CampaignCreatePayload,
    CampaignUpdatePayload,
} from "@/lib/api/campaigns";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import {
    ChevronLeft,
    ChevronRight,
    Eye,
    Loader2,
    Megaphone,
    Pencil,
    Plus,
    Target,
    Trash2,
    TrendingUp,
    Users
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const CAMPAIGN_STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

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

interface CampaignFormData {
  name: string;
  description: string;
  status: string;
  agents: AgentWithRole[];
}

const emptyForm: CampaignFormData = {
  name: "",
  description: "",
  status: "draft",
  agents: [],
};

export default function AdminCampaignsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("draft");
  const [formData, setFormData] = useState<CampaignFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const status = statusFilter === "all" ? undefined : statusFilter;
  const { data, isLoading, isError } = useCampaigns(page, pageSize, status);
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();
  const deleteMutation = useDeleteCampaign();

  // Fetch campaign detail for edit mode
  const { data: campaignDetail } = useCampaign(editingId ?? "");

  // Fetch all agents for the dropdown
  const { data: agents } = useQuery<AgentOption[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
  });

  const campaigns = data?.items ?? [];
  const totalCampaigns = data?.total ?? 0;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const totalAgentsEnrolled = campaigns.reduce((acc, c) => acc + c.agents_count, 0);

  const openCreateDialog = useCallback(() => {
    setEditingId(null);
    setEditingStatus("draft");
    setFormData(emptyForm);
    setFormErrors({});
    setSubmitError(null);
    setShowDialog(true);
  }, []);

  const openEditDialog = useCallback((campaignId: string) => {
    setEditingId(campaignId);
    setFormData(emptyForm);
    setFormErrors({});
    setSubmitError(null);
    setShowDialog(true);
  }, []);

  // Pre-populate form when campaign detail loads in edit mode
  useEffect(() => {
    if (editingId && campaignDetail) {
      setEditingStatus(campaignDetail.status);
      setFormData({
        name: campaignDetail.name,
        description: campaignDetail.description ?? "",
        status: campaignDetail.status,
        agents: campaignDetail.agents.map((a) => ({
          id: a.id,
          full_name: a.full_name,
          email: a.email,
          role: a.role as AgentWithRole["role"],
        })),
      });
    }
  }, [editingId, campaignDetail]);

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
      if (editingId) {
        const payload: CampaignUpdatePayload = {
          name: formData.name,
          description: formData.description || null,
          ...(formData.status !== editingStatus
            ? { status: formData.status }
            : {}),
          agents: formData.agents.map((a) => ({ agent_id: a.id, role: a.role })),
        };
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      } else {
        const payload: CampaignCreatePayload = {
          name: formData.name,
          description: formData.description || null,
          agents: formData.agents.map((a) => ({ agent_id: a.id, role: a.role })),
        };
        await createMutation.mutateAsync(payload);
      }
      setShowDialog(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      if (message.includes("409")) {
        setSubmitError("Campaign name is already in use");
      } else {
        setSubmitError("Could not save campaign. Please try again.");
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  if (isLoading) {
    return (
      <PageContent>
        <PageHeader
          title="Campaigns"
          subtitle="Manage training campaigns for your agents"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </PageContent>
    );
  }

  if (isError) {
    return (
      <PageContent>
        <PageHeader
          title="Campaigns"
          subtitle="Manage training campaigns for your agents"
        />
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Failed to load campaigns.
          </p>
        </div>
      </PageContent>
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContent>
      <PageHeader
        title="Campaigns"
        subtitle="Manage training campaigns for your agents"
        actions={
          <Button size="lg" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Campaign
          </Button>
        }
      />

      <FilterTabs
        tabs={CAMPAIGN_STATUS_TABS}
        activeTab={statusFilter}
        onChange={setStatusFilter}
      />

      {/* KPI Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
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
                Total Campaigns
              </p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {totalCampaigns}
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
                Active Campaigns
              </p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {activeCampaigns}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Users
                className="h-5 w-5 text-secondary-foreground"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Agents Enrolled
              </p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {totalAgentsEnrolled}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table or Empty State */}
      {campaigns.length === 0 ? (
        <PageEmpty
          icon={Megaphone}
          title="No campaigns yet"
          description="Create your first campaign to assign scenarios and track agent progress."
          actionLabel="Create Campaign"
          onAction={openCreateDialog}
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">
                      Scenarios
                    </th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">
                      Agents
                    </th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">
                      Created Date
                    </th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">
                      Modified Date
                    </th>
                    <th className="pb-3 text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-4 font-medium capitalize text-foreground">
                        <button
                          onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                          className="hover:underline hover:text-primary transition-colors text-left"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusBadgeVariant(c.status)} className="capitalize">
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {c.scenarios_count}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {c.agents_count}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {new Date(c.updated_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => router.push(`/admin/campaigns/${c.id}`)}
                            aria-label={`View ${c.name}`}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditDialog(c.id)}
                            aria-label={`Edit ${c.name}`}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(c.id)}
                            aria-label={`Delete ${c.name}`}
                            className="rounded p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {(data.page - 1) * data.page_size + 1}–
                  {Math.min(data.page * data.page_size, data.total)} of{" "}
                  {data.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {Array.from(
                    { length: Math.min(data.total_pages, 5) },
                    (_, i) => {
                      let pageNum: number;
                      if (data.total_pages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= data.total_pages - 2) {
                        pageNum = data.total_pages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                            pageNum === page
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(data.total_pages, p + 1))
                    }
                    disabled={page >= data.total_pages}
                    aria-label="Next page"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="z-[301] max-w-lg"
          backdropClassName="z-[300]"
        >
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Campaign" : "Create Campaign"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the campaign details below."
                : "Fill in the details to create a new campaign."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Campaign name"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-destructive">
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Optional description"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Status
              </label>
              <div className="mt-1">
                <Select
                  value={formData.status}
                  onChange={(value) =>
                    setFormData((p) => ({ ...p, status: value }))
                  }
                  options={STATUS_OPTIONS}
                  ariaLabel="Campaign status"
                />
              </div>
            </div>

            {/* Agent Dropdown */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Agents <span className="text-destructive">*</span>
              </label>
              <div className="mt-1">
                <AgentDropdown
                  agents={agents ?? []}
                  selectedAgents={formData.agents}
                  onChange={(newAgents) =>
                    setFormData((p) => ({ ...p, agents: newAgents }))
                  }
                />
              </div>
              {formErrors.agents && (
                <p className="mt-1 text-xs text-destructive">
                  {formErrors.agents}
                </p>
              )}
            </div>

            {/* Submit error */}
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" size="sm">Cancel</Button>}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Saving...
                </span>
              ) : editingId ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent
          className="z-[301]"
          backdropClassName="z-[300]"
        >
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this campaign? This action will
              archive the campaign and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" size="sm">Cancel</Button>}
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageContent>
  );
}
