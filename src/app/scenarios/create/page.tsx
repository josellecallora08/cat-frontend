"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function CreateScenarioPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{
    id: string;
    name: string;
    scenario_type: string;
    description: string;
    debtor_profile: Record<string, unknown>;
  } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGenerated(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/scenarios/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Failed: ${res.status}`);
      }

      const data = await res.json();
      setGenerated(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate scenario");
    } finally {
      setIsGenerating(false);
    }
  };

  const examplePrompts = [
    "A single mother who lost her BPO job during layoffs, owes 50k, very emotional and cries easily",
    "An OFW husband who just came back from Saudi, disputing charges his wife made on a credit card",
    "A college student who maxed out a credit card on gaming items, parents don't know about the debt",
    "A retired teacher on pension who got scammed online and now can't pay her utility bills",
    "An angry tricycle driver who says he already paid but the system still shows balance",
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-6"
      >
        ← Back to Scenarios
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create Scenario</CardTitle>
          <CardDescription>
            Describe a debtor situation and AI will generate a complete training scenario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Describe the debtor scenario:
            </label>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g., A single mother who lost her job and owes 30,000 pesos for 60 days, she is very cooperative but genuinely cannot pay..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Example prompts */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent transition-colors text-left"
                  disabled={isGenerating}
                >
                  {example.slice(0, 50)}...
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Generating scenario...
              </span>
            ) : (
              "✨ Generate Scenario"
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Generated result */}
          {generated && (
            <div className="rounded-lg border border-green-500/50 bg-green-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-medium text-sm">✓ Scenario created!</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                  {generated.scenario_type.replace(/_/g, " ")}
                </span>
              </div>

              <h3 className="font-semibold">{generated.name}</h3>
              <p className="text-sm text-muted-foreground">{generated.description}</p>

              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between border-b border-border pb-1">
                  <dt className="text-muted-foreground">Debtor</dt>
                  <dd className="font-medium">{generated.debtor_profile.name as string}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <dt className="text-muted-foreground">Balance</dt>
                  <dd className="font-medium">₱{generated.debtor_profile.outstanding_balance as string}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <dt className="text-muted-foreground">Days Past Due</dt>
                  <dd className="font-medium">{generated.debtor_profile.days_past_due as number} days</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-1">
                  <dt className="text-muted-foreground">Personality</dt>
                  <dd className="font-medium text-right max-w-[60%]">{generated.debtor_profile.personality_profile as string}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Goal</dt>
                  <dd className="font-medium text-right max-w-[60%]">{generated.debtor_profile.conversation_goal as string}</dd>
                </div>
              </dl>

              <div className="flex gap-2 pt-2">
                <Link href={`/scenarios/${generated.id}`} className="flex-1">
                  <Button className="w-full">Start Training</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGenerated(null);
                    setPrompt("");
                  }}
                >
                  Create Another
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
