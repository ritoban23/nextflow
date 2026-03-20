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
    <div className="min-w-[280px] rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-zinc-100 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <Type className="h-4 w-4 text-zinc-300" />
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
        className="min-h-[90px] w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
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
