"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, CircleX, Loader2 } from "lucide-react";

import type { NodeRun, WorkflowRun } from "@/lib/store";

type WorkflowHistoryProps = {
  runs: WorkflowRun[];
  isLoading?: boolean;
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

function statusBadgeClasses(status: WorkflowRun["status"]) {
  if (status === "SUCCESS") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "FAILED") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (status === "PARTIAL") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
}

function scopeBadgeClasses(scope: WorkflowRun["scope"]) {
  if (scope === "FULL") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (scope === "PARTIAL") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300";
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

export default function WorkflowHistory({ runs, isLoading, onRefresh }: WorkflowHistoryProps) {
  const [expandedRunIds, setExpandedRunIds] = useState<Record<string, boolean>>({});

  const sortedRuns = useMemo(
    () => [...runs].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt)),
    [runs]
  );

  const hasRunningRun = useMemo(
    () => sortedRuns.some((run) => run.status === "RUNNING"),
    [sortedRuns]
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
      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
        Loading runs...
      </div>
    );
  }

  if (sortedRuns.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-500">
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
          <div key={run.id} className="rounded-md border border-zinc-800 bg-zinc-900/60">
            <button
              type="button"
              onClick={() => toggleRun(run.id)}
              className="w-full px-3 py-3 text-left hover:bg-zinc-800/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-zinc-100">Run #{runNumber}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{formatTimestamp(run.startedAt)}</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="mt-0.5 h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="mt-0.5 h-4 w-4 text-zinc-400" />
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full border px-2 py-0.5 ${scopeBadgeClasses(run.scope)}`}
                >
                  {formatScope(run.scope)}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 ${statusBadgeClasses(run.status)}`}
                >
                  {formatStatus(run.status)}
                </span>
                <span className="text-zinc-500">{formatDuration(run.duration)}</span>
              </div>
            </button>

            {isExpanded ? (
              <div className="border-t border-zinc-800 px-3 py-2">
                {(run.nodeRuns ?? []).length === 0 ? (
                  <p className="text-xs text-zinc-500">No node-level data.</p>
                ) : (
                  <div className="space-y-2">
                    {(run.nodeRuns ?? []).map((nodeRun) => (
                      <div key={nodeRun.id} className="rounded-md border border-zinc-800 bg-[#161616] p-2">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-zinc-200">
                            <NodeRunStatusIcon status={nodeRun.status} />
                            <span>
                              {nodeRun.nodeType} ({nodeRun.nodeId})
                            </span>
                          </div>
                          <span className="text-zinc-500">
                            {formatDuration(nodeRun.executionTime)}
                          </span>
                        </div>

                        {nodeRun.error ? (
                          <p className="mt-1 text-xs text-red-300">Error: {nodeRun.error}</p>
                        ) : nodeRun.outputGenerated ? (
                          <p className="mt-1 text-xs text-zinc-400">
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
