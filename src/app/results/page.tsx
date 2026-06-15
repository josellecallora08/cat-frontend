"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function ResultsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Results</h2>
      <p className="text-muted-foreground mt-2">
        Your evaluation results, coaching reports, and learning plans will appear here.
      </p>

      <Card className="mt-6">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            No results yet. Complete a{" "}
            <Link href="/" className="text-primary underline">
              training session
            </Link>{" "}
            to receive your evaluation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
