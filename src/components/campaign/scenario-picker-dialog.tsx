"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAddCampaignScenarios } from "@/hooks/use-campaign-scenarios";
import type { ScenarioListItem } from "@/lib/api/scenarios";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const MAX_SELECTION = 50;
const DEBOUNCE_MS = 300;
const SEARCH_MAX_LENGTH = 100;

const SCENARIO_TYPES = [
  "Financial Hardship",
  "Angry Customer",
  "Payment Extension",
  "Balance Dispute",
] as const;

type ScenarioType = (typeof SCENARIO_TYPES)[number];

interface ScenarioPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  existingScenarioIds: string[];
  onSuccess: () => void;
}

function formatTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function typeMatchesFilter(scenarioType: string, filterType: ScenarioType): boolean {
  return formatTypeLabel(scenarioType).toLowerCase() === filterType.toLowerCase();
}

export function ScenarioPickerDialog({
  open,
  onOpenChange,
  campaignId,
  existingScenarioIds,
  onSuccess,
}: ScenarioPickerDialogProps) {
  // Render inner content only when open so state resets on each open
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[301] max-w-2xl" backdropClassName="z-[300]">
        {open && (
          <ScenarioPickerContent
            campaignId={campaignId}
            existingScenarioIds={existingScenarioIds}
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ScenarioPickerContentProps {
  campaignId: string;
  existingScenarioIds: string[];
  onSuccess: () => void;
  onClose: () => void;
}

function ScenarioPickerContent({
  campaignId,
  existingScenarioIds,
  onSuccess,
  onClose,
}: ScenarioPickerContentProps) {
  const token = useAuthStore((s) => s.token);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<ScenarioType>>(
    new Set(SCENARIO_TYPES)
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const addMutation = useAddCampaignScenarios(campaignId);

  // Fetch all active scenarios
  const { data: allScenarios, isLoading: isFetchingScenarios } = useQuery<ScenarioListItem[]>({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/scenarios`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch scenarios: ${response.status}`);
      }
      return response.json();
    },
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Available scenarios (exclude already assigned)
  const availableScenarios = useMemo(() => {
    if (!allScenarios) return [];
    const existingSet = new Set(existingScenarioIds);
    return allScenarios.filter((s) => !existingSet.has(s.id));
  }, [allScenarios, existingScenarioIds]);

  // Filtered scenarios based on search + type filter
  const filteredScenarios = useMemo(() => {
    return availableScenarios.filter((scenario) => {
      // Text search filter
      if (debouncedSearch) {
        const nameMatches = scenario.name
          .toLowerCase()
          .includes(debouncedSearch.toLowerCase());
        if (!nameMatches) return false;
      }

      // Type filter
      if (selectedTypes.size < SCENARIO_TYPES.length) {
        const matchesType = Array.from(selectedTypes).some((filterType) =>
          typeMatchesFilter(scenario.scenario_type, filterType)
        );
        if (!matchesType) return false;
      }

      return true;
    });
  }, [availableScenarios, debouncedSearch, selectedTypes]);

  const handleToggleScenario = useCallback((scenarioId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(scenarioId)) {
        next.delete(scenarioId);
      } else if (next.size < MAX_SELECTION) {
        next.add(scenarioId);
      }
      return next;
    });
  }, []);

  const handleToggleType = useCallback((type: ScenarioType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) {
          next.delete(type);
        }
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedIds.size === 0) return;

    addMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        onSuccess();
        onClose();
      },
      onError: (error: Error) => {
        if (error.message.includes("422")) {
          setNotification({
            type: "error",
            message:
              "Some selected scenarios are no longer available. Please deselect them and try again.",
          });
        } else {
          setNotification({
            type: "error",
            message: "Failed to add scenarios. Please try again.",
          });
        }
      },
    });
  }, [selectedIds, addMutation, onSuccess, onClose]);

  const isAtCap = selectedIds.size >= MAX_SELECTION;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Scenarios</DialogTitle>
      </DialogHeader>

      {/* Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            "rounded-md px-4 py-3 text-sm",
            notification.type === "success"
              ? "bg-success-muted text-success-foreground"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {notification.message}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value.slice(0, SEARCH_MAX_LENGTH))}
          placeholder="Search scenarios by name..."
          maxLength={SEARCH_MAX_LENGTH}
          className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Search scenarios"
        />
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        {SCENARIO_TYPES.map((type) => {
          const isActive = selectedTypes.has(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleToggleType(type)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
              aria-pressed={isActive}
              aria-label={`Filter by ${type}`}
            >
              {isActive && <Check className="h-3 w-3" aria-hidden="true" />}
              {type}
            </button>
          );
        })}
      </div>

      {/* Selection counter */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{selectedIds.size} selected</span>
        {isAtCap && (
          <span className="text-xs text-warning-foreground">
            Maximum of {MAX_SELECTION} scenarios reached
          </span>
        )}
      </div>

      {/* Scenario list */}
      <div
        className="max-h-64 overflow-y-auto rounded-md border border-border"
        role="listbox"
        aria-multiselectable="true"
        aria-label="Available scenarios"
      >
        {isFetchingScenarios ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="ml-2 text-sm text-muted-foreground">Loading scenarios...</span>
          </div>
        ) : filteredScenarios.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No scenarios match your search or filter criteria.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting the search text or type filters.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredScenarios.map((scenario) => {
              const isSelected = selectedIds.has(scenario.id);
              const isDisabled = !isSelected && isAtCap;

              return (
                <li
                  key={scenario.id}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isDisabled}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors",
                    isSelected
                      ? "bg-primary/5"
                      : isDisabled
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-muted/50"
                  )}
                  onClick={() => !isDisabled && handleToggleScenario(scenario.id)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-border bg-background"
                    )}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {scenario.name}
                    </p>
                    {scenario.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {scenario.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="default" className="shrink-0">
                    {formatTypeLabel(scenario.scenario_type)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <DialogFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={addMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={selectedIds.size === 0 || addMutation.isPending}
        >
          {addMutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Adding...
            </span>
          ) : (
            `Add Selected (${selectedIds.size})`
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
