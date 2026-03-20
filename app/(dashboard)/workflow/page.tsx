"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "reactflow";
import {
  ChevronLeft,
  ChevronRight,
  Crop,
  FileImage,
  FileVideo,
  MessageSquareText,
  Sparkles,
  Type,
} from "lucide-react";

import { useWorkflowStore } from "@/lib/store";
import TextNode from "@/components/nodes/TextNode";
import UploadImageNode from "@/components/nodes/UploadImageNode";
import UploadVideoNode from "@/components/nodes/UploadVideoNode";
import LLMNode from "@/components/nodes/LLMNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";
import WorkflowHistory from "@/components/WorkflowHistory";

import "reactflow/dist/style.css";

type NodePaletteItem = {
  type: string;
  label: string;
  icon: typeof Type;
};

type WorkflowNodeType =
  | "text"
  | "uploadImage"
  | "uploadVideo"
  | "llm"
  | "cropImage"
  | "extractFrame";

function getNodeDefaultData(nodeType: string) {
  if (nodeType === "text") {
    return { text: "" };
  }

  if (nodeType === "uploadImage") {
    return { imageUrl: "", uploading: false };
  }

  if (nodeType === "uploadVideo") {
    return { videoUrl: "", uploading: false };
  }

  if (nodeType === "llm") {
    return {
      model: "gemini-2.5-flash",
      systemPrompt: "",
      userMessage: "",
      output: "",
      running: false,
    };
  }

  if (nodeType === "cropImage") {
    return {
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
    };
  }

  if (nodeType === "extractFrame") {
    return { timestamp: "0" };
  }

  return {};
}

function buildSampleWorkflow() {
  const nodes: Node[] = [
    {
      id: "node-1",
      type: "uploadImage",
      position: { x: 80, y: 120 },
      data: { imageUrl: "", uploading: false },
    },
    {
      id: "node-2",
      type: "cropImage",
      position: { x: 350, y: 120 },
      data: {
        xPercent: 10,
        yPercent: 10,
        widthPercent: 80,
        heightPercent: 80,
      },
    },
    {
      id: "node-3",
      type: "text",
      position: { x: 80, y: 340 },
      data: {
        text: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description.",
      },
    },
    {
      id: "node-4",
      type: "text",
      position: { x: 80, y: 560 },
      data: {
        text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
      },
    },
    {
      id: "node-5",
      type: "llm",
      position: { x: 650, y: 360 },
      data: {
        model: "gemini-2.5-flash",
        systemPrompt: "",
        userMessage: "",
        output: "",
        running: false,
      },
    },
    {
      id: "node-6",
      type: "uploadVideo",
      position: { x: 80, y: 780 },
      data: { videoUrl: "", uploading: false },
    },
    {
      id: "node-7",
      type: "extractFrame",
      position: { x: 350, y: 780 },
      data: { timestamp: "50%" },
    },
    {
      id: "node-8",
      type: "text",
      position: { x: 980, y: 360 },
      data: {
        text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.",
      },
    },
    {
      id: "node-9",
      type: "llm",
      position: { x: 1280, y: 420 },
      data: {
        model: "gemini-2.5-flash",
        systemPrompt: "",
        userMessage: "",
        output: "",
        running: false,
      },
    },
  ];

  const edges: Edge[] = [
    { id: "e1-2", source: "node-1", target: "node-2", targetHandle: "image_url", animated: true, style: { stroke: "#8b5cf6" } },
    { id: "e3-5", source: "node-3", target: "node-5", targetHandle: "system_prompt", animated: true, style: { stroke: "#8b5cf6" } },
    { id: "e4-5", source: "node-4", target: "node-5", targetHandle: "user_message", animated: true, style: { stroke: "#8b5cf6" } },
    { id: "e2-5", source: "node-2", target: "node-5", targetHandle: "images", animated: true, style: { stroke: "#8b5cf6" } },
    { id: "e6-7", source: "node-6", target: "node-7", targetHandle: "video_url", animated: true, style: { stroke: "#8b5cf6" } },
    { id: "e8-9", source: "node-8", target: "node-9", targetHandle: "system_prompt", animated: true, style: { stroke: "#8b5cf6" } },
    { id: "e5-9", source: "node-5", target: "node-9", targetHandle: "user_message", animated: true, style: { stroke: "#8b5cf6" } },
    { id: "e2-9", source: "node-2", target: "node-9", targetHandle: "images", animated: true, style: { stroke: "#8b5cf6" } },
    { id: "e7-9", source: "node-7", target: "node-9", targetHandle: "images", animated: true, style: { stroke: "#8b5cf6" } },
  ];

  return { nodes, edges };
}

function wouldCreateCycle(connection: Connection, edges: Edge[]) {
  if (!connection.source || !connection.target) {
    return false;
  }

  if (connection.source === connection.target) {
    return true;
  }

  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const current = outgoing.get(edge.source) ?? [];
    current.push(edge.target);
    outgoing.set(edge.source, current);
  }

  const next = outgoing.get(connection.source) ?? [];
  next.push(connection.target);
  outgoing.set(connection.source, next);

  const queue = [connection.target];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current === connection.source) {
      return true;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    for (const child of outgoing.get(current) ?? []) {
      queue.push(child);
    }
  }

  return false;
}

function flashInvalidSourceHandle(source: string, sourceHandle: string | null) {
  const specificHandleSelector = sourceHandle
    ? `[data-nodeid="${source}"][data-handleid="${sourceHandle}"]`
    : null;
  const fallbackSelector = `[data-nodeid="${source}"].react-flow__handle-source`;

  const targetElement =
    (specificHandleSelector
      ? document.querySelector(specificHandleSelector)
      : null) ?? document.querySelector(fallbackSelector);

  if (!targetElement) {
    return;
  }

  targetElement.classList.add("handle-invalid-flash");
  window.setTimeout(() => {
    targetElement.classList.remove("handle-invalid-flash");
  }, 260);
}

function isConnectionValid(connection: Connection, nodes: Node[]) {
  if (!connection.source || !connection.target) {
    return false;
  }

  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode?.type || !targetNode?.type) {
    return false;
  }

  const sourceType = sourceNode.type as WorkflowNodeType;
  const targetType = targetNode.type as WorkflowNodeType;
  const targetHandle = connection.targetHandle;

  if (!targetHandle) {
    return false;
  }

  if (sourceType === "text") {
    return targetHandle === "system_prompt" || targetHandle === "user_message";
  }

  if (sourceType === "uploadImage") {
    return targetHandle === "image_url" || targetHandle === "images";
  }

  if (sourceType === "uploadVideo") {
    return targetHandle === "video_url";
  }

  if (sourceType === "llm") {
    return (
      targetHandle === "user_message" &&
      targetType === "llm" &&
      connection.source !== connection.target
    );
  }

  if (sourceType === "cropImage") {
    return targetHandle === "images";
  }

  if (sourceType === "extractFrame") {
    return targetHandle === "images";
  }

  return false;
}

const NODE_PALETTE: NodePaletteItem[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "uploadImage", label: "Upload Image", icon: FileImage },
  { type: "uploadVideo", label: "Upload Video", icon: FileVideo },
  { type: "llm", label: "LLM", icon: Sparkles },
  { type: "cropImage", label: "Crop Image", icon: Crop },
  { type: "extractFrame", label: "Extract Frame", icon: MessageSquareText },
];

const nodeTypes = {
  text: TextNode,
  uploadImage: UploadImageNode,
  uploadVideo: UploadVideoNode,
  llm: LLMNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

function WorkflowPageContent() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<Node, Edge> | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [isEditingWorkflowName, setIsEditingWorkflowName] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);
  const selectedNodesRef = useRef<string[]>([]);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  const setGraph = useWorkflowStore((state) => state.setGraph);
  const addNode = useWorkflowStore((state) => state.addNode);
  const setEdges = useWorkflowStore((state) => state.setEdges);
  const setHistory = useWorkflowStore((state) => state.setHistory);
  const workflowRunHistory = useWorkflowStore((state) => state.workflowRunHistory);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const setRunning = useWorkflowStore((state) => state.setRunning);
  const selectedNodes = useWorkflowStore((state) => state.selectedNodes);
  const setSelectedNodes = useWorkflowStore((state) => state.setSelectedNodes);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const canUndo = useWorkflowStore((state) => state.canUndo);
  const canRedo = useWorkflowStore((state) => state.canRedo);

  const onConnect = useCallback(
    (connection: Connection) => {
      let normalizedConnection = connection;

      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (
        sourceNode?.type === "text" &&
        targetNode?.type === "llm" &&
        (connection.targetHandle === "images" || !connection.targetHandle)
      ) {
        normalizedConnection = {
          ...connection,
          targetHandle: "user_message",
        };
      }

      // Temporary debug log for validating handle IDs during connection attempts.
      console.log("[workflow:onConnect]", {
        source: normalizedConnection.source,
        sourceHandle: normalizedConnection.sourceHandle,
        target: normalizedConnection.target,
        targetHandle: normalizedConnection.targetHandle,
        full: normalizedConnection,
      });

      if (!isConnectionValid(normalizedConnection, nodes)) {
        if (normalizedConnection.source) {
          flashInvalidSourceHandle(
            normalizedConnection.source,
            normalizedConnection.sourceHandle ?? null
          );
        }
        return;
      }

      if (wouldCreateCycle(normalizedConnection, edges)) {
        if (normalizedConnection.source) {
          flashInvalidSourceHandle(
            normalizedConnection.source,
            normalizedConnection.sourceHandle ?? null
          );
        }
        return;
      }

      const nextEdge = {
        ...normalizedConnection,
        animated: true,
        style: { stroke: "#8b5cf6" },
      };

      setEdges(addEdge(nextEdge, edges));
    },
    [edges, nodes, setEdges]
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const recordHistory = changes.some((change) => change.type !== "select");
      setNodes(applyNodeChanges(changes, nodes), { recordHistory });
    },
    [nodes, setNodes]
  );

  const onDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>, nodeType: string) => {
      event.dataTransfer.setData("nodeType", nodeType);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("nodeType");

      if (!nodeType || !reactFlowInstance || !wrapperRef.current) {
        return;
      }

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode({
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: getNodeDefaultData(nodeType),
      });
    },
    [addNode, reactFlowInstance]
  );

  const addNodeToCanvasCenter = useCallback(
    (nodeType: string) => {
      if (!reactFlowInstance || !wrapperRef.current) {
        return;
      }

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });

      addNode({
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data: getNodeDefaultData(nodeType),
      });
    },
    [addNode, reactFlowInstance]
  );

  const persistWorkflow = useCallback(async (nameOverride?: string) => {
    if (isSaving) {
      return workflowId;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: workflowId ?? undefined,
          name: nameOverride ?? workflowName ?? "Untitled Workflow",
          nodes,
          edges,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save workflow");
      }

      const workflow = (await response.json()) as { id: string; name: string };
      setWorkflowId(workflow.id);
      setWorkflowName(workflow.name);
      return workflow.id;
    } finally {
      setIsSaving(false);
    }
  }, [edges, isSaving, nodes, workflowId, workflowName]);

  const deleteSelectedNodes = useCallback(() => {
    const ids = [...selectedNodesRef.current];
    if (ids.length === 0) {
      return;
    }

    for (const nodeId of ids) {
      removeNode(nodeId);
    }
  }, [removeNode]);

  const loadSampleWorkflow = useCallback(() => {
    const sample = buildSampleWorkflow();
    setGraph({ nodes: sample.nodes, edges: sample.edges });
    setWorkflowName("Product Marketing Kit Generator");
    setWorkflowId(null);
    setSelectedNodes([]);
  }, [setGraph, setSelectedNodes]);

  const exportWorkflowJson = useCallback(() => {
    const payload = {
      nodes,
      edges,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "workflow.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [edges, nodes]);

  const importWorkflowJson = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      try {
        const file = event.target.files?.[0];
        if (!file) {
          return;
        }

        const raw = await file.text();
        const parsed = JSON.parse(raw) as { nodes?: Node[]; edges?: Edge[] };

        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          throw new Error("Imported JSON must include nodes[] and edges[] arrays");
        }

        setGraph({
          nodes: parsed.nodes,
          edges: parsed.edges,
        });

        setSelectedNodes([]);
      } catch (error) {
        window.alert(
          error instanceof Error
            ? error.message
            : "Unable to import workflow JSON"
        );
      } finally {
        event.target.value = "";
      }
    },
    [setGraph, setSelectedNodes]
  );

  const fetchRunHistory = useCallback(
    async (targetWorkflowId: string) => {
      setHistoryLoading(true);
      try {
        const response = await fetch(`/api/runs?workflowId=${targetWorkflowId}`);
        if (!response.ok) {
          throw new Error("Unable to load run history");
        }

        const runs = await response.json();
        setHistory(runs);
      } finally {
        setHistoryLoading(false);
      }
    },
    [setHistory]
  );

  const runWorkflow = useCallback(
    async (scope: "FULL" | "PARTIAL" | "SINGLE", nodeIds?: string[]) => {
      const savedWorkflowId = await persistWorkflow();
      if (!savedWorkflowId) {
        return;
      }

      const selectedSet = new Set(nodeIds ?? []);
      setNodes(
        nodes.map((node) => {
          const isTargetNode =
            scope === "FULL" ? true : selectedSet.has(node.id);

          if (!isTargetNode) {
            return node;
          }

          const currentData = (node.data ?? {}) as Record<string, unknown>;
          return {
            ...node,
            data: {
              ...currentData,
              isRunning: true,
              running: true,
              isComplete: false,
              result: null,
            },
          };
        }),
        { recordHistory: false }
      );

      setRunning(true);

      try {
        const response = await fetch("/api/runs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflowId: savedWorkflowId,
            scope,
            nodeIds,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to trigger workflow run");
        }

        await fetchRunHistory(savedWorkflowId);
        window.setTimeout(() => {
          void fetchRunHistory(savedWorkflowId);
        }, 3500);
      } finally {
        setRunning(false);
      }
    },
    [fetchRunHistory, nodes, persistWorkflow, setNodes, setRunning]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      const nextSelectedIds = selected.map((node) => node.id).sort();

      if (
        nextSelectedIds.length === selectedNodesRef.current.length &&
        nextSelectedIds.every((id, index) => id === selectedNodesRef.current[index])
      ) {
        return;
      }

      selectedNodesRef.current = nextSelectedIds;
      setSelectedNodes(nextSelectedIds);
    },
    [setSelectedNodes]
  );

  useEffect(() => {
    selectedNodesRef.current = [...selectedNodes].sort();
  }, [selectedNodes]);

  useEffect(() => {
    if (!workflowId) {
      setHistory([]);
      return;
    }

    void fetchRunHistory(workflowId);
  }, [fetchRunHistory, setHistory, workflowId]);

  useEffect(() => {
    if (workflowRunHistory.length === 0) {
      return;
    }

    const latestRun = [...workflowRunHistory].sort(
      (a, b) => +new Date(b.startedAt) - +new Date(a.startedAt)
    )[0];

    if (!latestRun?.nodeRuns?.length) {
      return;
    }

    const nodeRunByNodeId = new Map(latestRun.nodeRuns.map((nodeRun) => [nodeRun.nodeId, nodeRun]));
    let hasChanges = false;

    const nextNodes = nodes.map((node) => {
      const nodeRun = nodeRunByNodeId.get(node.id);
      if (!nodeRun) {
        return node;
      }

      const currentData = (node.data ?? {}) as Record<string, unknown>;
      const nextIsRunning = nodeRun.status === "RUNNING";
      const nextIsComplete = nodeRun.status === "SUCCESS";
      const nextResult =
        node.type === "llm" && nextIsComplete ? nodeRun.outputGenerated ?? null : null;

      const didChange =
        currentData.isRunning !== nextIsRunning ||
        currentData.running !== nextIsRunning ||
        currentData.isComplete !== nextIsComplete ||
        (node.type === "llm" && currentData.result !== nextResult);

      if (!didChange) {
        return node;
      }

      hasChanges = true;

      return {
        ...node,
        data: {
          ...currentData,
          isRunning: nextIsRunning,
          running: nextIsRunning,
          isComplete: nextIsComplete,
          ...(node.type === "llm"
            ? {
                result: nextResult,
                output: nextResult ?? currentData.output,
              }
            : {}),
        },
      };
    });

    if (hasChanges) {
      setNodes(nextNodes, { recordHistory: false });
    }
  }, [nodes, setNodes, workflowRunHistory]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          redo();
          return;
        }

        undo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const active = document.activeElement;
        if (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement
        ) {
          return;
        }

        event.preventDefault();
        deleteSelectedNodes();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteSelectedNodes, redo, undo]);

  const sidebarWidthClass = isSidebarCollapsed ? "w-16" : "w-[240px]";

  const filteredPalette = useMemo(
    () =>
      NODE_PALETTE.filter((item) =>
        item.label.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [search]
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-zinc-100">
      <aside
        className={`${sidebarWidthClass} flex h-full shrink-0 flex-col border-r border-zinc-800 bg-[#111] transition-all duration-200`}
      >
        <div className="flex items-center justify-between p-3">
          {!isSidebarCollapsed ? (
            <span className="text-sm font-semibold text-zinc-200">Nodes</span>
          ) : (
            <span className="w-0" />
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-300 hover:bg-zinc-800"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {!isSidebarCollapsed ? (
          <>
            <div className="px-3 pb-3">
              <input
                type="text"
                placeholder="Search nodes"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="px-3 pb-3">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Quick Access
              </h2>
              <div className="space-y-2">
                {filteredPalette.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.type}
                      type="button"
                      draggable
                      onDragStart={(event) => onDragStart(event, item.type)}
                      onClick={() => addNodeToCanvasCenter(item.type)}
                      className="flex w-full cursor-grab items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-800 active:cursor-grabbing"
                    >
                      <Icon className="h-4 w-4 text-zinc-300" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-[#0f0f0f] px-4">
          {isEditingWorkflowName ? (
            <input
              aria-label="Workflow name"
              value={workflowName}
              onChange={(event) => setWorkflowName(event.target.value)}
              onBlur={() => {
                setIsEditingWorkflowName(false);
                void persistWorkflow(workflowName);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setIsEditingWorkflowName(false);
                  void persistWorkflow(workflowName);
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setIsEditingWorkflowName(false);
                }
              }}
              autoFocus
              className="w-[320px] rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-100 focus:border-zinc-500 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingWorkflowName(true)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-left text-sm font-medium text-zinc-100 hover:bg-zinc-800"
            >
              {workflowName}
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void persistWorkflow();
              }}
              disabled={isSaving}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                void runWorkflow("FULL");
              }}
              className="rounded-md border border-purple-500 bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-500"
            >
              {isRunning ? "Running..." : "Run"}
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
              disabled={!canUndo}
              onClick={undo}
            >
              Undo
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
              disabled={!canRedo}
              onClick={redo}
            >
              Redo
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
              onClick={exportWorkflowJson}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
              onClick={() => importFileInputRef.current?.click()}
            >
              Import JSON
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
              onClick={loadSampleWorkflow}
            >
              Load Sample
            </button>
            <input
              ref={importFileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                void importWorkflowJson(event);
              }}
            />
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div
            ref={wrapperRef}
            className="relative min-w-0 flex-1 h-full w-full"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => setContextMenu(null)}
          >
            <ReactFlow
              className="h-full w-full"
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onInit={setReactFlowInstance}
              onNodesChange={onNodesChange}
              onConnect={onConnect}
              onEdgesChange={onEdgesChange}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();
                setContextMenu({
                  nodeId: node.id,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onSelectionChange={onSelectionChange}
              fitView
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: "#8b5cf6" },
              }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={16}
                size={1}
                color="#2a2a2a"
              />
              <MiniMap
                position="bottom-right"
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #333",
                }}
                nodeStrokeColor="#555"
                nodeColor="#222"
                maskColor="rgba(0, 0, 0, 0.25)"
              />
              <Controls
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #333",
                }}
              />
            </ReactFlow>

            {contextMenu ? (
              <div
                className="absolute z-30 min-w-[160px] rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
                style={{
                  left: contextMenu.x,
                  top: contextMenu.y,
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                  onClick={() => {
                    void runWorkflow("SINGLE", [contextMenu.nodeId]);
                    setContextMenu(null);
                  }}
                >
                  Run This Node
                </button>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-red-300 hover:bg-zinc-800"
                  onClick={() => {
                    removeNode(contextMenu.nodeId);
                    setContextMenu(null);
                  }}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          <aside className="w-[280px] shrink-0 border-l border-zinc-800 bg-[#111] p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Workflow History</h2>
            <WorkflowHistory
              runs={workflowRunHistory}
              isLoading={historyLoading}
              onRefresh={() => {
                if (!workflowId) {
                  return;
                }

                void fetchRunHistory(workflowId);
              }}
            />

            <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
              {selectedNodes.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    void runWorkflow("PARTIAL", selectedNodes);
                  }}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-200 hover:bg-zinc-800"
                >
                  Run Selected ({selectedNodes.length})
                </button>
              ) : (
                <span>Select nodes to enable partial run.</span>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <ReactFlowProvider>
      <WorkflowPageContent />
    </ReactFlowProvider>
  );
}
