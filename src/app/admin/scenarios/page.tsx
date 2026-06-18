"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface Scenario {
  id: string;
  name: string;
  scenario_type: string;
}

async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${API_BASE_URL}/api/scenarios`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const SCENARIO_TYPES = [
  { value: "FINANCIAL_HARDSHIP", label: "Financial Hardship" },
  { value: "ANGRY_CUSTOMER", label: "Angry Customer" },
  { value: "PAYMENT_EXTENSION", label: "Payment Extension" },
  { value: "BALANCE_DISPUTE", label: "Balance Dispute" },
];

export default function AdminScenariosPage() {
  const queryClient = useQueryClient();
  const { data: scenarios, isLoading } = useQuery({
    queryKey: ["scenarios"],
    queryFn: fetchScenarios,
  });

  // Form state
  const [debtorName, setDebtorName] = useState("");
  const [gender, setGender] = useState("female");
  const [amount, setAmount] = useState("");
  const [daysPastDue, setDaysPastDue] = useState("30");
  const [scenarioType, setScenarioType] = useState("FINANCIAL_HARDSHIP");
  const [situation, setSituation] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleGenerate = async () => {
    if (!debtorName.trim() || !amount.trim() || !situation.trim()) {
      setMessage({ type: "error", text: "Please fill in name, amount, and situation." });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    // Build a structured prompt from the form fields
    const prompt = [
      `Debtor name: ${debtorName} (${gender})`,
      `Outstanding balance: ${amount} pesos`,
      `Days past due: ${daysPastDue}`,
      `Scenario type: ${SCENARIO_TYPES.find(t => t.value === scenarioType)?.label}`,
      `Situation: ${situation}`,
      instructions ? `Special instructions for the debtor's behavior: ${instructions}` : "",
    ].filter(Boolean).join(". ");

    try {
      const res = await fetch(`${API_BASE_URL}/api/scenarios/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, scenario_type: scenarioType }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setMessage({ type: "success", text: `Created: "${data.name}"` });

      // Reset form
      setDebtorName("");
      setAmount("");
      setSituation("");
      setInstructions("");
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
    } catch {
      setMessage({ type: "error", text: "Failed to generate scenario. Check your API key." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Manage Scenarios</h2>
        <p className="text-muted-foreground">Create and manage training scenarios</p>
      </div>

      {/* Create Scenario Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create New Scenario</CardTitle>
          <CardDescription>Fill in the debtor details and AI generates the full training scenario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Name + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Debtor Name</label>
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., Maria Santos"
                value={debtorName}
                onChange={(e) => setDebtorName(e.target.value)}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Gender</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={isGenerating}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>

          {/* Row 2: Amount + Days Past Due */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Outstanding Amount (₱)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Days Past Due</label>
              <input
                type="number"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g., 45"
                value={daysPastDue}
                onChange={(e) => setDaysPastDue(e.target.value)}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Row 3: Scenario Type */}
          <div>
            <label className="text-sm font-medium mb-1 block">Scenario Type</label>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              disabled={isGenerating}
            >
              {SCENARIO_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Row 4: Situation */}
          <div>
            <label className="text-sm font-medium mb-1 block">Situation / Backstory</label>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., Nawalan ng work sa BPO dahil sa layoffs. Single mother with 2 kids. Very emotional and cries easily when pressured."
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Row 5: Special Instructions */}
          <div>
            <label className="text-sm font-medium mb-1 block">Debtor Instructions (optional)</label>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., Will hang up if agent raises voice. Will agree to pay if offered installment of less than 5000/month. Switches to full Tagalog when angry."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Control how the debtor behaves during the conversation
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !debtorName.trim() || !amount.trim() || !situation.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              "✨ Generate Scenario"
            )}
          </Button>

          {/* Message */}
          {message && (
            <div className={`rounded-lg border p-3 text-sm ${message.type === "success" ? "border-green-500/50 bg-green-500/10 text-green-700" : "border-destructive/50 bg-destructive/10 text-destructive"}`}>
              {message.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenario List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Scenarios ({scenarios?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {scenarios?.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.scenario_type.replace(/_/g, " ").toLowerCase()}</p>
                  </div>
                  <Link href={`/scenarios/${s.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
