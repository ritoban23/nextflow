"use client";

import { Clapperboard } from "lucide-react";
import { useMemo } from "react";
import {
  Handle,
  Position,
  useEdges,
  type Edge,
  type NodeProps,
} from "reactflow";

import { useWorkflowStore } from "@/lib/store";

type ExtractFrameNodeData = {
  timestamp?: string;
};

const handleStyle = {
  height: 12,
  width: 12,
  border: "2px solid #c084fc",
  background: "#8b5cf6",
};

function hasIncomingConnection(
  edges: Edge[],
  nodeId: string,
  handleId: string,
): boolean {
  return edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === handleId,
  );
}

export default function ExtractFrameNode({
  id,
  data,
}: NodeProps<ExtractFrameNodeData>) {
  const edges = useEdges();
  const updateNode = useWorkflowStore((state) => state.updateNode);

  const connectedInputs = useMemo(
    () => ({
      videoUrl: hasIncomingConnection(edges, id, "video_url"),
      timestamp: hasIncomingConnection(edges, id, "timestamp"),
    }),
    [edges, id],
  );

  const timestamp = data?.timestamp ?? "0";

  return (
    <div className="min-w-[280px] rounded-[10px] border border-white/10 bg-[#1e1e1e] p-3 text-zinc-100 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)]">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-[#d97706]">
          <Clapperboard className="h-3.5 w-3.5 text-white" />
        </span>
        <span>Extract Frame</span>
      </div>

      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
        <Handle
          id="video_url"
          type="target"
          position={Position.Left}
          style={{ ...handleStyle, top: 84 }}
          className="node-handle"
        />
        <span>video_url (required)</span>
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">timestamp</label>
        <Handle
          id="timestamp"
          type="target"
          position={Position.Left}
          style={{ ...handleStyle, top: 125 }}
          className="node-handle"
        />
        <input
          type="text"
          value={timestamp}
          disabled={connectedInputs.timestamp}
          onChange={(event) =>
            updateNode(id, {
              data: {
                ...data,
                timestamp: event.target.value,
              },
            })
          }
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
            connectedInputs.timestamp
              ? "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500"
              : "border-white/10 bg-[#111] text-zinc-100 focus:border-zinc-500"
          }`}
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-zinc-400">
        <span>output</span>
        <Handle
          id="output"
          type="source"
          position={Position.Right}
          style={{ ...handleStyle, top: 162 }}
          className="node-handle"
        />
      </div>
    </div>
  );
}
