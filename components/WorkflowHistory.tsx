"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleX,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NodeRun, WorkflowRun } from "@/lib/store";

type WorkflowHistoryProps = {
  runs: WorkflowRun[];
  isLoading?: boolean;
  isThemeDark?: boolean;
  onRefresh?: () => void | Promise<void>;
};

function formatScope(scope: WorkflowRun["scope"]) {
  if (scope === "FULL") {
    return "Full";
  }

  if (scope === "PARTIAL") {
    return "Partial";
  }

  return "Single";
}

function formatStatus(status: WorkflowRun["status"]) {
  if (status === "SUCCESS") {
    return "Success";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  if (status === "PARTIAL") {
    return "Partial";
  }

  return "Running";
}

function formatDuration(duration: number | null) {
  if (duration == null) {
    return "-";
  }

  if (duration < 1000) {
    return `${duration}ms`;
  }

  return `${(duration / 1000).toFixed(1)}s`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusBadgeClasses(
  status: WorkflowRun["status"],
  isThemeDark: boolean,
) {
  if (status === "SUCCESS") {
    return isThemeDark
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
  }

  if (status === "FAILED") {
    return isThemeDark
      ? "border-red-500/30 bg-red-500/15 text-red-200"
      : "border-red-500/25 bg-red-500/10 text-red-700";
  }

  if (status === "PARTIAL") {
    return isThemeDark
      ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
      : "border-amber-500/25 bg-amber-500/10 text-amber-700";
  }

  return isThemeDark
    ? "border-zinc-500/30 bg-zinc-500/20 text-zinc-200"
    : "border-zinc-400/30 bg-zinc-400/10 text-zinc-700";
}

function scopeBadgeClasses(scope: WorkflowRun["scope"], isThemeDark: boolean) {
  if (scope === "FULL") {
    return isThemeDark
      ? "border-sky-500/30 bg-sky-500/15 text-sky-200"
      : "border-sky-500/25 bg-sky-500/10 text-sky-700";
  }

  if (scope === "PARTIAL") {
    return isThemeDark
      ? "border-violet-500/30 bg-violet-500/15 text-violet-200"
      : "border-violet-500/25 bg-violet-500/10 text-violet-700";
  }

  return isThemeDark
    ? "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-200"
    : "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-700";
}

function truncateText(value: string | null, maxLength = 60) {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function NodeRunStatusIcon({ status }: { status: NodeRun["status"] }) {
  if (status === "SUCCESS") {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  }

  if (status === "FAILED") {
    return <CircleX className="h-3.5 w-3.5 text-red-400" />;
  }

  return <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />;
}

export default function WorkflowHistory({
  runs,
  isLoading,
  isThemeDark = true,
  onRefresh,
}: WorkflowHistoryProps) {
  const [expandedRunIds, setExpandedRunIds] = useState<Record<string, boolean>>(
    {},
  );

  const sortedRuns = useMemo(
    () =>
      [...runs].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt)),
    [runs],
  );

  const hasRunningRun = useMemo(
    () => sortedRuns.some((run) => run.status === "RUNNING"),
    [sortedRuns],
  );

  useEffect(() => {
    if (!onRefresh || !hasRunningRun) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void onRefresh();
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasRunningRun, onRefresh]);

  const toggleRun = (runId: string) => {
    setExpandedRunIds((current) => ({
      ...current,
      [runId]: !current[runId],
    }));
  };

  if (isLoading) {
    return (
      <div
        className={`mt-4 rounded-lg border p-4 text-sm ${
          isThemeDark
            ? "border-white/10 bg-[#111111] text-zinc-400"
            : "border-black/10 bg-white text-zinc-600"
        }`}
      >
        Loading runs...
      </div>
    );
  }

  if (sortedRuns.length === 0) {
    return (
      <div
        className={`mt-4 rounded-lg border p-4 text-sm ${
          isThemeDark
            ? "border-white/10 bg-[#111111] text-zinc-500"
            : "border-black/10 bg-white text-zinc-600"
        }`}
      >
        No runs yet
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 overflow-y-auto pr-1">
      {sortedRuns.map((run, index) => {
        const isExpanded = Boolean(expandedRunIds[run.id]);
        const runNumber = sortedRuns.length - index;

        return (
          <div
            key={run.id}
            className={`rounded-lg border ${
              isThemeDark
                ? `bg-[#1e1e1e] ${run.status === "RUNNING" ? "border-zinc-500/30" : "border-white/10"}`
                : `bg-white ${run.status === "RUNNING" ? "border-zinc-300" : "border-black/10"}`
            }`}
          >
            <Button
              variant="ghost"
              type="button"
              onClick={() => toggleRun(run.id)}
              className={`h-auto w-full justify-start px-3 py-3 text-left ${
                isThemeDark ? "hover:bg-white/5" : "hover:bg-black/5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className={`text-sm font-semibold ${isThemeDark ? "text-zinc-100" : "text-zinc-800"}`}
                  >
                    Run #{runNumber}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${isThemeDark ? "text-zinc-400" : "text-zinc-500"}`}
                  >
                    {formatTimestamp(run.startedAt)}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 ${isThemeDark ? "text-zinc-400" : "text-zinc-500"}`}
                  />
                ) : (
                  <ChevronRight
                    className={`mt-0.5 h-4 w-4 ${isThemeDark ? "text-zinc-400" : "text-zinc-500"}`}
                  />
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant="outline"
                  className={`rounded-full px-2 py-0.5 ${scopeBadgeClasses(run.scope, isThemeDark)}`}
                >
                  {formatScope(run.scope)}
                </Badge>
                <Badge
                  variant="outline"
                  className={`rounded-full px-2 py-0.5 ${statusBadgeClasses(run.status, isThemeDark)}`}
                >
                  {formatStatus(run.status)}
                </Badge>
                <span
                  className={isThemeDark ? "text-zinc-500" : "text-zinc-600"}
                >
                  {formatDuration(run.duration)}
                </span>
              </div>
            </Button>

            {isExpanded ? (
              <div
                className={`border-t px-3 py-2 ${
                  isThemeDark ? "border-white/10" : "border-black/10"
                }`}
              >
                {(run.nodeRuns ?? []).length === 0 ? (
                  <p
                    className={`text-xs ${isThemeDark ? "text-zinc-500" : "text-zinc-600"}`}
                  >
                    No node-level data.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(run.nodeRuns ?? []).map((nodeRun) => (
                      <div
                        key={nodeRun.id}
                        className={`rounded-md border p-2 ${
                          isThemeDark
                            ? "border-white/10 bg-[#151515]"
                            : "border-black/10 bg-[#f8fafc]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div
                            className={`flex items-center gap-2 ${isThemeDark ? "text-zinc-200" : "text-zinc-700"}`}
                          >
                            <NodeRunStatusIcon status={nodeRun.status} />
                            <span>
                              {nodeRun.nodeType} ({nodeRun.nodeId})
                            </span>
                          </div>
                          <span
                            className={
                              isThemeDark ? "text-zinc-500" : "text-zinc-500"
                            }
                          >
                            {formatDuration(nodeRun.executionTime)}
                          </span>
                        </div>

                        {nodeRun.error ? (
                          <p
                            className={`mt-1 text-xs ${isThemeDark ? "text-red-300" : "text-red-600"}`}
                          >
                            Error: {nodeRun.error}
                          </p>
                        ) : nodeRun.outputGenerated ? (
                          <p
                            className={`mt-1 text-xs ${isThemeDark ? "text-zinc-400" : "text-zinc-600"}`}
                          >
                            Output: {truncateText(nodeRun.outputGenerated)}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
