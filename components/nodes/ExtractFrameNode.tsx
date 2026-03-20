"use client";

import { useMemo } from "react";
import { Clapperboard } from "lucide-react";
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
  handleId: string
): boolean {
  return edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === handleId
  );
}

export default function ExtractFrameNode({ id, data }: NodeProps<ExtractFrameNodeData>) {
  const edges = useEdges();
  const updateNode = useWorkflowStore((state) => state.updateNode);

  const connectedInputs = useMemo(
    () => ({
      videoUrl: hasIncomingConnection(edges, id, "video_url"),
      timestamp: hasIncomingConnection(edges, id, "timestamp"),
    }),
    [edges, id]
  );

  const timestamp = data?.timestamp ?? "0";

  return (
    <div className="min-w-[280px] rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-zinc-100 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <Clapperboard className="h-4 w-4 text-zinc-300" />
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
              : "border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-zinc-500"
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
