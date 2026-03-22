"use client";

import { Type } from "lucide-react";
import { Handle, Position, type NodeProps } from "reactflow";

import { useWorkflowStore } from "@/lib/store";

type TextNodeData = {
  text?: string;
};

const handleStyle = {
  height: 12,
  width: 12,
  border: "2px solid #c084fc",
  background: "#8b5cf6",
};

export default function TextNode({ id, data }: NodeProps<TextNodeData>) {
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const text = data?.text ?? "";

  return (
    <div className="min-w-[280px] rounded-[10px] border border-white/10 bg-[#1e1e1e] p-3 text-zinc-100 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)]">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-[#1e293b]">
          <Type className="h-3.5 w-3.5 text-white" />
        </span>
        <span>Text</span>
      </div>

      <textarea
        value={text}
        onChange={(event) =>
          updateNode(id, {
            data: {
              ...data,
              text: event.target.value,
            },
          })
        }
        placeholder="Enter text..."
        className="min-h-[90px] w-full resize-y rounded-md border border-white/10 bg-[#111] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
      />

      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-zinc-400">
        <span>text</span>
        <Handle
          id="text"
          type="source"
          position={Position.Right}
          style={handleStyle}
          className="node-handle"
        />
      </div>
    </div>
  );
}
