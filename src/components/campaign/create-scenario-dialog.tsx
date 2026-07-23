"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useCreateCampaignScenario } from "@/hooks/use-campaign-scenarios";

const SCENARIO_TYPE_OPTIONS = [
  { value: "FINANCIAL_HARDSHIP", label: "Financial Hardship" },
  { value: "ANGRY_CUSTOMER", label: "Angry Customer" },
  { value: "PAYMENT_EXTENSION", label: "Payment Extension" },
  { value: "BALANCE_DISPUTE", label: "Balance Dispute" },
];

interface CreateScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess: () => void;
}

interface FormData {
  title: string;
  description: string;
  scenarioType: string;
  promptBlocks: string[];
  debtorName: string;
  outstandingBalance: string;
  daysPastDue: string;
  personality: string;
  conversationalGoal: string;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  scenarioType: "FINANCIAL_HARDSHIP",
  promptBlocks: [""],
  debtorName: "",
  outstandingBalance: "",
  daysPastDue: "",
  personality: "",
  conversationalGoal: "",
};

export function CreateScenarioDialog({
  open,
  onOpenChange,
  campaignId,
  onSuccess,
}: CreateScenarioDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[301] max-w-2xl max-h-[90vh] overflow-y-auto"
        backdropClassName="z-[300]"
      >
        {open && (
          <CreateScenarioForm
            campaignId={campaignId}
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CreateScenarioFormProps {
  campaignId: string;
  onSuccess: () => void;
  onClose: () => void;
}

function CreateScenarioForm({
  campaignId,
  onSuccess,
  onClose,
}: CreateScenarioFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createMutation = useCreateCampaignScenario(campaignId);

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const addPromptBlock = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      promptBlocks: [...prev.promptBlocks, ""],
    }));
  }, []);

  const removePromptBlock = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      promptBlocks: prev.promptBlocks.filter((_, i) => i !== index),
    }));
  }, []);

  const updatePromptBlock = useCallback((index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      promptBlocks: prev.promptBlocks.map((block, i) =>
        i === index ? value : block
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.promptBlocks;
      return next;
    });
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.debtorName.trim()) {
      newErrors.debtorName = "Debtor name is required";
    }

    const balance = parseFloat(formData.outstandingBalance);
    if (!formData.outstandingBalance || isNaN(balance) || balance <= 0) {
      newErrors.outstandingBalance = "Must be a positive number";
    }

    const days = parseInt(formData.daysPastDue, 10);
    if (
      !formData.daysPastDue ||
      isNaN(days) ||
      days < 1 ||
      !Number.isInteger(days)
    ) {
      newErrors.daysPastDue = "Must be a positive whole number";
    }

    const nonEmptyBlocks = formData.promptBlocks.filter((b) => b.trim());
    if (nonEmptyBlocks.length === 0) {
      newErrors.promptBlocks = "At least one prompt block is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    setSubmitError(null);

    createMutation.mutate(
      {
        name: formData.title.trim(),
        scenario_type: formData.scenarioType,
        description: formData.description.trim(),
        debtor_profile: {
          name: formData.debtorName.trim(),
          outstanding_balance: formData.outstandingBalance.trim(),
          days_past_due: parseInt(formData.daysPastDue, 10),
          personality_profile: formData.personality.trim(),
          conversation_goal: formData.conversationalGoal.trim(),
          prompt_blocks: formData.promptBlocks.filter((b) => b.trim()),
        },
      },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
        onError: (error: Error) => {
          setSubmitError(
            error.message || "Failed to create scenario. Please try again."
          );
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, createMutation, onSuccess, onClose]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Custom Scenario</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Submit error */}
        {submitError && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-foreground">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., Difficult Financial Hardship Case"
            maxLength={255}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-destructive">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Brief description of the scenario"
            maxLength={2000}
          />
        </div>

        {/* Tags (Scenario Type) */}
        <div>
          <label className="text-sm font-medium text-foreground">
            Category <span className="text-destructive">*</span>
          </label>
          <div className="mt-1">
            <Select
              value={formData.scenarioType}
              onChange={(value) => updateField("scenarioType", value)}
              options={SCENARIO_TYPE_OPTIONS}
              ariaLabel="Scenario type"
            />
          </div>
        </div>

        {/* Debtor Profile Fields */}
        <div className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Debtor Profile
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Debtor Name */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.debtorName}
                onChange={(e) => updateField("debtorName", e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Maria Santos"
                maxLength={255}
              />
              {errors.debtorName && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.debtorName}
                </p>
              )}
            </div>

            {/* Outstanding Balance */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Outstanding Balance <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formData.outstandingBalance}
                onChange={(e) =>
                  updateField("outstandingBalance", e.target.value)
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., 25000.00"
              />
              {errors.outstandingBalance && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.outstandingBalance}
                </p>
              )}
            </div>

            {/* Days Past Due */}
            <div>
              <label className="text-sm font-medium text-foreground">
                Days Past Due <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.daysPastDue}
                onChange={(e) => updateField("daysPastDue", e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., 45"
              />
              {errors.daysPastDue && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.daysPastDue}
                </p>
              )}
            </div>
          </div>

          {/* Personality */}
          <div className="mt-4">
            <label className="text-sm font-medium text-foreground">
              Personality
            </label>
            <textarea
              value={formData.personality}
              onChange={(e) => updateField("personality", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe the debtor's personality and communication style"
              maxLength={2000}
            />
          </div>

          {/* Conversational Goal */}
          <div className="mt-4">
            <label className="text-sm font-medium text-foreground">
              Conversational Goal
            </label>
            <textarea
              value={formData.conversationalGoal}
              onChange={(e) =>
                updateField("conversationalGoal", e.target.value)
              }
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="What is the debtor trying to achieve in the call?"
              maxLength={2000}
            />
          </div>
        </div>

        {/* Prompt Blocks */}
        <div className="border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Prompt Blocks <span className="text-destructive">*</span>
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPromptBlock}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Block
            </Button>
          </div>
          {errors.promptBlocks && (
            <p className="mb-2 text-xs text-destructive">
              {errors.promptBlocks}
            </p>
          )}

          <div className="space-y-3">
            {formData.promptBlocks.map((block, index) => (
              <div key={index} className="flex gap-2">
                <textarea
                  value={block}
                  onChange={(e) => updatePromptBlock(index, e.target.value)}
                  rows={2}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={`Instruction block ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePromptBlock(index)}
                  disabled={formData.promptBlocks.length <= 1}
                  aria-label={`Remove block ${index + 1}`}
                  className="mt-1"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <DialogClose
          render={
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          }
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Creating...
            </span>
          ) : (
            "Create Scenario"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
