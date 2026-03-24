"use client";

import { Bot, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Handle,
  Position,
  useEdges,
  type Edge,
  type NodeProps,
} from "reactflow";

import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/lib/store";

type LLMNodeData = {
  model?:
    | "gemini-2.5-flash"
    | "gemini-2.5-flash-lite"
    | "gemini-2.5-pro"
    | "gemini-2.0-flash";
  systemPrompt?: string;
  userMessage?: string;
  result?: string | null;
  isRunning?: boolean;
  isComplete?: boolean;
  output?: string;
  running?: boolean;
};

const handleStyle = {
  height: 12,
  width: 12,
  border: "2px solid #c084fc",
  background: "#8b5cf6",
};

const MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
] as const;

function hasIncomingConnection(
  edges: Edge[],
  nodeId: string,
  handleId: string,
): boolean {
  return edges.some(
    (edge) => edge.target === nodeId && edge.targetHandle === handleId,
  );
}

export default function LLMNode({ id, data }: NodeProps<LLMNodeData>) {
  const edges = useEdges();
  const updateNode = useWorkflowStore((state) => state.updateNode);
  const [isSimulatingRun, setIsSimulatingRun] = useState(false);

  const model = data?.model ?? "gemini-2.5-flash";
  const systemPrompt = data?.systemPrompt ?? "";
  const userMessage = data?.userMessage ?? "";
  const result = data?.result ?? null;
  const output = data?.output ?? "";
  const inlineResult = result ?? output;
  const isComplete = Boolean(data?.isComplete) || Boolean(inlineResult);
  const isRunning =
    Boolean(data?.isRunning) || Boolean(data?.running) || isSimulatingRun;

  const disabledByConnection = useMemo(
    () => ({
      systemPrompt: hasIncomingConnection(edges, id, "system_prompt"),
      userMessage: hasIncomingConnection(edges, id, "user_message"),
    }),
    [edges, id],
  );

  const runNode = () => {
    if (isRunning) {
      return;
    }

    setIsSimulatingRun(true);
    updateNode(id, {
      data: {
        ...data,
        isRunning: true,
        isComplete: false,
        result: null,
        running: true,
      },
    });

    window.setTimeout(() => {
      const generated =
        userMessage.trim() || systemPrompt.trim()
          ? `(${model}) ${userMessage.trim() || systemPrompt.trim()}`
          : `(${model}) Ready for input.`;

      updateNode(id, {
        data: {
          ...data,
          isRunning: false,
          isComplete: true,
          result: generated,
          running: false,
          output: generated,
        },
      });
      setIsSimulatingRun(false);
    }, 900);
  };

  return (
    <div
      className={`min-w-[280px] rounded-[10px] border border-white/10 bg-[#1e1e1e] p-3 text-zinc-100 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)] ${
        isRunning ? "node-running" : ""
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-[#facc15]">
          <Bot className="h-3.5 w-3.5 text-black" />
        </span>
        <span>LLM</span>
      </div>

      <label className="mb-2 block text-xs text-zinc-400">Model</label>
      <select
        value={model}
        onChange={(event) =>
          updateNode(id, {
            data: {
              ...data,
              model: event.target.value as LLMNodeData["model"],
            },
          })
        }
        className="mb-3 w-full rounded-md border border-white/10 bg-[#111] px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
      >
        {MODELS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            system_prompt
          </label>
          <Handle
            id="system_prompt"
            type="target"
            position={Position.Left}
            style={{ ...handleStyle, top: 82 }}
            className="node-handle"
          />
          <textarea
            value={systemPrompt}
            disabled={disabledByConnection.systemPrompt}
            onChange={(event) =>
              updateNode(id, {
                data: {
                  ...data,
                  systemPrompt: event.target.value,
                },
              })
            }
            className={`min-h-[64px] w-full resize-y rounded-md border px-3 py-2 text-sm focus:outline-none ${
              disabledByConnection.systemPrompt
                ? "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500"
                : "border-white/10 bg-[#111] text-zinc-100 focus:border-zinc-500"
            }`}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">
            user_message
          </label>
          <Handle
            id="user_message"
            type="target"
            position={Position.Left}
            style={{ ...handleStyle, top: 178 }}
            className="node-handle"
          />
          <textarea
            value={userMessage}
            disabled={disabledByConnection.userMessage}
            onChange={(event) =>
              updateNode(id, {
                data: {
                  ...data,
                  userMessage: event.target.value,
                },
              })
            }
            className={`min-h-[72px] w-full resize-y rounded-md border px-3 py-2 text-sm focus:outline-none ${
              disabledByConnection.userMessage
                ? "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500"
                : "border-white/10 bg-[#111] text-zinc-100 focus:border-zinc-500"
            }`}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <Handle
            id="images"
            type="target"
            position={Position.Left}
            style={{ ...handleStyle, top: 286 }}
            className="node-handle"
          />
          <span>images</span>
        </div>

        <div className="flex items-center gap-2">
          <span>output</span>
          <Handle
            id="output"
            type="source"
            position={Position.Right}
            style={{ ...handleStyle, top: 286 }}
            className="node-handle"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        type="button"
        onClick={runNode}
        disabled={isRunning}
        className="mt-3 inline-flex h-auto items-center gap-2 rounded-md border border-white/10 bg-[#171717] px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Run Node
      </Button>

      {isComplete && inlineResult ? (
        <div className="mt-3 rounded-md border border-white/10 bg-[#111] p-2">
          <p className="mb-1 text-[10px] tracking-wide text-zinc-500 uppercase">
            Result
          </p>
          <div className="max-h-28 overflow-y-auto rounded border border-white/10 bg-[#161616] p-2 text-xs leading-relaxed text-zinc-200">
            {inlineResult}
          </div>
        </div>
      ) : null}
    </div>
  );
}
