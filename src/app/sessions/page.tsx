"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function SessionsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Sessions</h2>
      <p className="text-muted-foreground mt-2">
        Your training session history will appear here after completing calls.
      </p>

      <Card className="mt-6">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            No sessions yet. Start by selecting a{" "}
            <Link href="/" className="text-primary underline">
              training scenario
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
