"use client";

import { useMemo } from "react";
import { Crop } from "lucide-react";
import {
  Handle,
  Position,
  useEdges,
  type Edge,
  type NodeProps,
} from "reactflow";

import { useWorkflowStore } from "@/lib/store";

type CropImageNodeData = {
  xPercent?: number;
  yPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
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

export default function CropImageNode({ id, data }: NodeProps<CropImageNodeData>) {
  const edges = useEdges();
  const updateNode = useWorkflowStore((state) => state.updateNode);

  const connectedInputs = useMemo(
    () => ({
      imageUrl: hasIncomingConnection(edges, id, "image_url"),
      xPercent: hasIncomingConnection(edges, id, "x_percent"),
      yPercent: hasIncomingConnection(edges, id, "y_percent"),
      widthPercent: hasIncomingConnection(edges, id, "width_percent"),
      heightPercent: hasIncomingConnection(edges, id, "height_percent"),
    }),
    [edges, id]
  );

  const xPercent = data?.xPercent ?? 0;
  const yPercent = data?.yPercent ?? 0;
  const widthPercent = data?.widthPercent ?? 100;
  const heightPercent = data?.heightPercent ?? 100;

  const setNumericValue = (
    key: keyof CropImageNodeData,
    rawValue: string,
    fallback: number
  ) => {
    const next = Number(rawValue);

    updateNode(id, {
      data: {
        ...data,
        [key]: Number.isFinite(next) ? next : fallback,
      },
    });
  };

  return (
    <div className="min-w-[280px] rounded-[10px] border border-white/10 bg-[#1e1e1e] p-3 text-zinc-100 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)]">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-[#a855f7]">
          <Crop className="h-3.5 w-3.5 text-white" />
        </span>
        <span>Crop Image</span>
      </div>

      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
        <Handle
          id="image_url"
          type="target"
          position={Position.Left}
          style={{ ...handleStyle, top: 80 }}
          className="node-handle"
        />
        <span>image_url (required)</span>
      </div>

      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">x_percent</label>
          <Handle
            id="x_percent"
            type="target"
            position={Position.Left}
            style={{ ...handleStyle, top: 120 }}
            className="node-handle"
          />
          <input
            type="number"
            value={xPercent}
            disabled={connectedInputs.xPercent}
            onChange={(event) => setNumericValue("xPercent", event.target.value, 0)}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              connectedInputs.xPercent
                ? "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500"
                : "border-white/10 bg-[#111] text-zinc-100 focus:border-zinc-500"
            }`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">y_percent</label>
          <Handle
            id="y_percent"
            type="target"
            position={Position.Left}
            style={{ ...handleStyle, top: 188 }}
            className="node-handle"
          />
          <input
            type="number"
            value={yPercent}
            disabled={connectedInputs.yPercent}
            onChange={(event) => setNumericValue("yPercent", event.target.value, 0)}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              connectedInputs.yPercent
                ? "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500"
                : "border-white/10 bg-[#111] text-zinc-100 focus:border-zinc-500"
            }`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">width_percent</label>
          <Handle
            id="width_percent"
            type="target"
            position={Position.Left}
            style={{ ...handleStyle, top: 256 }}
            className="node-handle"
          />
          <input
            type="number"
            value={widthPercent}
            disabled={connectedInputs.widthPercent}
            onChange={(event) =>
              setNumericValue("widthPercent", event.target.value, 100)
            }
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              connectedInputs.widthPercent
                ? "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500"
                : "border-white/10 bg-[#111] text-zinc-100 focus:border-zinc-500"
            }`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">height_percent</label>
          <Handle
            id="height_percent"
            type="target"
            position={Position.Left}
            style={{ ...handleStyle, top: 324 }}
            className="node-handle"
          />
          <input
            type="number"
            value={heightPercent}
            disabled={connectedInputs.heightPercent}
            onChange={(event) =>
              setNumericValue("heightPercent", event.target.value, 100)
            }
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              connectedInputs.heightPercent
                ? "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500"
                : "border-white/10 bg-[#111] text-zinc-100 focus:border-zinc-500"
            }`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-zinc-400">
        <span>output</span>
        <Handle
          id="output"
          type="source"
          position={Position.Right}
          style={{ ...handleStyle, top: 360 }}
          className="node-handle"
        />
      </div>
    </div>
  );
}
