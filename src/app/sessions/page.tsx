"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import gsap from "gsap";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import {
  Mic,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const PAGE_SIZE = 8;

interface SessionItem {
  id: string;
  scenario_name: string;
  persona_name: string;
  agent_name: string;
  agent_email: string;
  status: string;
  overall_score: number | null;
  created_at: string;
}

interface PaginatedSessions {
  items: SessionItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

type SortBy = "created_at" | "score" | "scenario" | "status";
type SortDir = "asc" | "desc";

const sortOptions: { value: `${SortBy}:${SortDir}`; label: string }[] = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "score:desc", label: "Highest score" },
  { value: "score:asc", label: "Lowest score" },
  { value: "scenario:asc", label: "Scenario A–Z" },
  { value: "status:asc", label: "Status" },
];

const statusFilters = [
  { value: "ALL", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "error", label: "Error" },
];

async function fetchSessions(params: {
  page: number;
  agentId?: string;
  status: string;
  sortBy: SortBy;
  sortDir: SortDir;
}): Promise<PaginatedSessions> {
  const qs = new URLSearchParams({
    page: String(params.page),
    page_size: String(PAGE_SIZE),
    sort_by: params.sortBy,
    sort_dir: params.sortDir,
  });
  if (params.agentId) qs.set("agent_id", params.agentId);
  if (params.status !== "ALL") qs.set("status", params.status);

  const res = await fetch(`${API_BASE_URL}/api/dashboard/sessions?${qs}`);
  if (!res.ok) throw new Error("Failed to load sessions");
  return res.json();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type BadgeVariant = "default" | "success" | "warning" | "accent" | "destructive";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "warning", label: "Pending" },
    active: { variant: "accent", label: "Active" },
    completed: { variant: "success", label: "Completed" },
    error: { variant: "destructive", label: "Error" },
  };
  const { variant, label } = map[status] ?? {
    variant: "default" as BadgeVariant,
    label: status,
  };
  return <Badge variant={variant}>{label}</Badge>;
}

export default function SessionsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const agentFilter = !isAdmin && user?.id ? user.id : undefined;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState<`${SortBy}:${SortDir}`>("created_at:desc");
  const [sortBy, sortDir] = sort.split(":") as [SortBy, SortDir];

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["sessions", agentFilter, page, status, sortBy, sortDir],
    queryFn: () =>
      fetchSessions({ page, agentId: agentFilter, status, sortBy, sortDir }),
    placeholderData: keepPreviousData,
  });

  // Reset to first page whenever filters/sort change
  useEffect(() => {
    setPage(1);
  }, [status, sort]);

  const sessions = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  // Sliding pill indicator for the status filter tabs
  const tablistRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const prevStatusRef = useRef(status);

  const movePill = (animate: boolean) => {
    const el = tabRefs.current[status];
    const pill = pillRef.current;
    const list = tablistRef.current;
    if (!el || !pill || !list) return;
    const listBox = list.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    gsap.to(pill, {
      left: box.left - listBox.left,
      top: box.top - listBox.top,
      width: box.width,
      height: box.height,
      opacity: 1,
      duration: animate && !prefersReduced ? 0.4 : 0,
      ease: "power3.out",
    });
  };

  useEffect(() => {
    movePill(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    movePill(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => {
    const onResize = () => movePill(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smooth list transition on data change — slides in the direction the pill moved
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!listRef.current || sessions.length === 0) return;

    // Direction based on the status tab order
    const order = statusFilters.map((f) => f.value);
    const prevIndex = order.indexOf(prevStatusRef.current);
    const nextIndex = order.indexOf(status);
    prevStatusRef.current = status;
    const dir = nextIndex > prevIndex ? 1 : nextIndex < prevIndex ? -1 : 0;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const rows = listRef.current.querySelectorAll("[data-session-row]");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rows,
        { opacity: 0, x: dir * 32, y: dir === 0 ? 12 : 0 },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.38,
          ease: "power3.out",
          stagger: 0.04,
          clearProps: "transform",
        }
      );
    }, listRef);
    return () => ctx.revert();
  }, [sessions, status]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium leading-tight text-foreground">
            Sessions
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isAdmin ? "All training sessions." : "Your training session history."}
          </p>
        </div>

        {/* Sort dropdown */}
        <div className="w-48">
          <Select
            id="sort"
            ariaLabel="Sort sessions"
            value={sort}
            onChange={(v) => setSort(v as `${SortBy}:${SortDir}`)}
            options={sortOptions}
            icon={<ArrowUpDown className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </header>

      {/* Status filter tabs */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Filter sessions by status"
        className="relative flex flex-wrap items-center gap-1.5 border-b border-border pb-4"
      >
        {/* Sliding active indicator */}
        <span
          ref={pillRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 h-9 rounded-full bg-primary"
          style={{ width: 0, opacity: 0 }}
        />
        {statusFilters.map((f) => {
          const active = status === f.value;
          return (
            <button
              key={f.value}
              ref={(el) => {
                tabRefs.current[f.value] = el;
              }}
              role="tab"
              aria-selected={active}
              onClick={() => setStatus(f.value)}
              className={cn(
                "relative z-10 min-h-9 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Initial load */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div
          role="alert"
          className="flex flex-col items-center rounded-lg border border-border bg-card px-6 py-12 text-center"
        >
          <h2 className="text-base font-medium text-foreground">
            Couldn&apos;t load sessions
          </h2>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && sessions.length === 0 && (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Mic className="h-6 w-6 text-secondary-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-medium text-foreground">
            {status === "ALL" ? "No sessions yet" : "No sessions in this category"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {status === "ALL"
              ? "Pick a scenario to run your first training call."
              : "Try a different status filter."}
          </p>
          {status === "ALL" ? (
            <Link href="/scenarios" className="mt-4">
              <Button size="sm">Browse scenarios</Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setStatus("ALL")}>
              View all
            </Button>
          )}
        </div>
      )}

      {/* List */}
      {!isError && sessions.length > 0 && (
        <>
          <ul
            ref={listRef}
            className={cn(
              "space-y-3 transition-opacity duration-200",
              isFetching && "opacity-60"
            )}
          >
            {sessions.map((session) => (
              <li key={session.id} data-session-row>
                <Card className="py-0 transition-colors duration-100 hover:bg-muted">
                  <CardContent className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {session.scenario_name}
                        </p>
                        <StatusBadge status={session.status} />
                        {session.overall_score !== null && (
                          <span className="text-xs font-medium text-foreground">
                            {session.overall_score}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {session.persona_name} · {formatDate(session.created_at)}
                        {isAdmin && ` · ${session.agent_name}`}
                      </p>
                    </div>
                    {session.status === "completed" && (
                      <Link href={`/sessions/${session.id}/results`} className="shrink-0">
                        <Button variant="outline" size="sm">
                          View results
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <nav
            aria-label="Sessions pagination"
            className="flex items-center justify-between gap-4 pt-2"
          >
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </span>{" "}
              of <span className="font-medium text-foreground">{total}</span>
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Prev
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - page) <= 1
                  )
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const gap = prev && p - prev > 1;
                    return (
                      <span key={p} className="flex items-center">
                        {gap && (
                          <span className="px-1 text-xs text-muted-foreground">…</span>
                        )}
                        <button
                          onClick={() => setPage(p)}
                          aria-current={p === page ? "page" : undefined}
                          className={cn(
                            "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            p === page
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
