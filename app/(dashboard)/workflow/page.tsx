"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
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
  Check,
  Circle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crop,
  Download,
  FileImage,
  FileVideo,
  Hand,
  History,
  Keyboard,
  Moon,
  MessageSquareText,
  Plus,
  Save,
  Scissors,
  Send,
  Sparkles,
  Sun,
  Type,
  Upload,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

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
  iconBgClass: string;
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
  { type: "text", label: "Text", icon: Type, iconBgClass: "bg-[#1e293b]" },
  { type: "uploadImage", label: "Upload Image", icon: FileImage, iconBgClass: "bg-[#0ea5e9]" },
  { type: "uploadVideo", label: "Upload Video", icon: FileVideo, iconBgClass: "bg-[#f97316]" },
  { type: "llm", label: "LLM", icon: Sparkles, iconBgClass: "bg-[#facc15]" },
  { type: "cropImage", label: "Crop Image", icon: Crop, iconBgClass: "bg-[#a855f7]" },
  { type: "extractFrame", label: "Extract Frame", icon: MessageSquareText, iconBgClass: "bg-[#d97706]" },
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
  const [workflowName, setWorkflowName] = useState("Untitled");
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isThemeDark, setIsThemeDark] = useState(true);
  const [isWorkflowMenuOpen, setIsWorkflowMenuOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDrawSelectionMode, setIsDrawSelectionMode] = useState(false);
  const [isPanMode, setIsPanMode] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);
  const { user } = useUser();
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
          name: nameOverride ?? workflowName ?? "Untitled",
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

  const cutSelectedConnections = useCallback(() => {
    const selectedSet = new Set(selectedNodesRef.current);
    if (selectedSet.size === 0) {
      return;
    }

    setEdges(
      edges.filter(
        (edge) =>
          !selectedSet.has(edge.source) && !selectedSet.has(edge.target)
      )
    );
  }, [edges, setEdges]);

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

  const filteredPalette = NODE_PALETTE;

  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "User";

  const shortName =
    displayName.length > 18 ? `${displayName.slice(0, 18)}...` : displayName;

  const rootThemeClass = isThemeDark
    ? "bg-black text-zinc-100"
    : "bg-[#eef1f5] text-zinc-900";

  const sidebarThemeClass = isThemeDark
    ? "border-white/5 bg-black"
    : "border-black/10 bg-[#e9edf3]";

  const canvasThemeClass = isThemeDark ? "bg-[#121212]" : "bg-[#f5f7fa]";

  const rightPanelThemeClass = isThemeDark
    ? "border-white/5 bg-black"
    : "border-black/10 bg-[#edf1f6]";

  const canvasBackground = isThemeDark
    ? "radial-gradient(120px 120px at 50% 50%, rgba(73,72,71,0.16), rgba(73,72,71,0) 45%), linear-gradient(90deg, #121212 0%, #121212 100%)"
    : "radial-gradient(120px 120px at 50% 50%, rgba(72,83,101,0.14), rgba(72,83,101,0) 45%), linear-gradient(90deg, #f5f7fa 0%, #f5f7fa 100%)";

  const shortcutsRows: Array<{ action: string; key: string }> = [
    { action: "Undo", key: "Cmd/Ctrl + Z" },
    { action: "Redo", key: "Cmd/Ctrl + Shift + Z" },
    { action: "Save", key: "Cmd/Ctrl + S" },
    { action: "Select all", key: "Cmd/Ctrl + A" },
    { action: "Deselect all", key: "Esc" },
    { action: "New node", key: "N" },
    { action: "Delete selected", key: "Backspace / Delete" },
    { action: "Run selected", key: "Bottom action bar" },
  ];

  return (
    <div className={`flex h-screen w-full overflow-hidden ${rootThemeClass}`} style={{ fontFamily: "Manrope, Inter, Arial, sans-serif" }}>
      <aside
        className={`${sidebarWidthClass} flex h-full shrink-0 flex-col border-r transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${sidebarThemeClass}`}
      >
        <div className={`flex items-center justify-between border-b p-3 ${isThemeDark ? "border-white/5" : "border-black/10"}`}>
          {!isSidebarCollapsed ? (
            <span className="w-0" />
          ) : (
            <span className="w-0" />
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className={`rounded-md border p-1.5 transition-colors ${
              isThemeDark
                ? "border-white/10 bg-[#1a1a1a] text-zinc-300 hover:bg-[#242424]"
                : "border-black/10 bg-white text-zinc-700 shadow-[0_6px_18px_rgba(15,23,42,0.08)] hover:bg-[#f8fafc]"
            }`}
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
            <div className="px-3 pb-3 pt-3">
              <h2
                className={`mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                  isThemeDark ? "text-zinc-500" : "text-zinc-600"
                }`}
              >
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
                      className={`flex w-full cursor-grab items-center gap-2 rounded-md border border-transparent bg-transparent px-3 py-2 text-left text-sm active:cursor-grabbing ${
                        isThemeDark
                          ? "text-zinc-100 hover:bg-white/5"
                          : "text-zinc-700 hover:bg-black/5"
                      }`}
                    >
                      <span className={`inline-flex size-7 items-center justify-center rounded-md ${item.iconBgClass}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`mt-auto border-t p-4 ${
                isThemeDark ? "border-white/5" : "border-black/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "h-10 w-10 ring-1 ring-white/10",
                      },
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-medium ${
                      isThemeDark ? "text-white" : "text-zinc-800"
                    }`}
                  >
                    {shortName}
                  </p>
                  <p
                    className={`text-xs ${
                      isThemeDark ? "text-zinc-500" : "text-zinc-600"
                    }`}
                  >
                    Free plan
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="px-2 pt-2">
              <div className="space-y-2">
                {filteredPalette.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      title={item.label}
                      draggable
                      onDragStart={(event) => onDragStart(event, item.type)}
                      onClick={() => addNodeToCanvasCenter(item.type)}
                      className={`flex w-full items-center justify-center rounded-lg p-2 transition-colors ${
                        isThemeDark ? "hover:bg-white/5" : "hover:bg-black/5"
                      }`}
                    >
                      <span className={`inline-flex size-8 items-center justify-center rounded-md ${item.iconBgClass}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-auto p-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-10 w-10 ring-1 ring-white/10",
                    },
                  }}
                />
              </div>
            </div>
          </>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <div
            ref={wrapperRef}
            className={`relative h-full min-w-0 flex-1 w-full ${canvasThemeClass}`}
            style={{
              backgroundImage: canvasBackground,
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => {
              setContextMenu(null);
              setIsWorkflowMenuOpen(false);
            }}
          >
            <div className="pointer-events-none absolute left-4 top-3 z-20">
              <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsWorkflowMenuOpen((prev) => !prev);
                  }}
                  className={`pointer-events-auto inline-flex items-center gap-2 rounded-[20px] border px-3 py-2 text-left text-sm font-medium transition-colors ${
                    isThemeDark
                      ? "border-white/10 bg-[#1a1a1a] text-zinc-100 hover:bg-[#252525]"
                      : "border-black/10 bg-white text-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.14)] hover:bg-[#f8fafc]"
                  }`}
                >
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded-md border text-[10px] font-bold ${
                      isThemeDark
                        ? "border-white/10 bg-[#2a2a2a] text-zinc-200"
                        : "border-black/10 bg-[#edf1f6] text-zinc-700"
                    }`}
                  >
                    K
                  </span>
                  {workflowName}
                  <ChevronDown className={`h-4 w-4 ${isThemeDark ? "text-zinc-400" : "text-zinc-500"}`} />
                </button>

                {isWorkflowMenuOpen ? (
                  <div
                    className={`pointer-events-auto absolute left-0 top-full z-30 mt-2 w-[190px] rounded-xl border p-1.5 shadow-xl ${
                      isThemeDark
                        ? "border-white/10 bg-[#121212]"
                        : "border-black/10 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
                    }`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                        isThemeDark
                          ? "text-zinc-200 hover:bg-white/5"
                          : "text-zinc-700 hover:bg-black/5"
                      }`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                        isThemeDark
                          ? "text-zinc-200 hover:bg-white/5"
                          : "text-zinc-700 hover:bg-black/5"
                      }`}
                    >
                      Workspaces
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="pointer-events-none absolute right-4 top-3 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsThemeDark((prev) => !prev)}
                title="Toggle theme"
                className={`pointer-events-auto inline-flex items-center justify-center rounded-lg border p-2 backdrop-blur transition-colors ${
                  isThemeDark
                    ? "border-white/10 bg-[#1a1a1a]/90 text-zinc-300 hover:bg-[#252525]"
                    : "border-black/10 bg-white/90 text-zinc-700 shadow-[0_8px_24px_rgba(15,23,42,0.14)] hover:bg-[#f8fafc]"
                }`}
              >
                {isThemeDark ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </button>

              <div
                className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 backdrop-blur ${
                  isThemeDark
                    ? "border-white/10 bg-[#1a1a1a]/90"
                    : "border-black/10 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.14)]"
                }`}
              >
                <Download className={`h-4 w-4 ${isThemeDark ? "text-zinc-300" : "text-zinc-600"}`} />
                <button
                  type="button"
                  className={`text-xs ${
                    isThemeDark
                      ? "text-zinc-200 hover:text-white"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                  onClick={exportWorkflowJson}
                >
                  Export JSON
                </button>
                <span className={isThemeDark ? "text-zinc-700" : "text-zinc-400"}>|</span>
                <Upload className={`h-4 w-4 ${isThemeDark ? "text-zinc-300" : "text-zinc-600"}`} />
                <button
                  type="button"
                  className={`text-xs ${
                    isThemeDark
                      ? "text-zinc-200 hover:text-white"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                  onClick={() => importFileInputRef.current?.click()}
                >
                  Import JSON
                </button>
                <span className={isThemeDark ? "text-zinc-700" : "text-zinc-400"}>|</span>
                <Check className={`h-4 w-4 ${isThemeDark ? "text-zinc-300" : "text-zinc-600"}`} />
                <button
                  type="button"
                  className={`text-xs ${
                    isThemeDark
                      ? "text-zinc-200 hover:text-white"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                  onClick={loadSampleWorkflow}
                >
                  Load Sample
                </button>
              </div>

              <div
                className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 backdrop-blur ${
                  isThemeDark
                    ? "border-white/10 bg-[#1a1a1a]/90"
                    : "border-black/10 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.14)]"
                }`}
              >
                <Save className={`h-4 w-4 ${isThemeDark ? "text-zinc-300" : "text-zinc-600"}`} />
                <button
                  type="button"
                  onClick={() => {
                    void persistWorkflow();
                  }}
                  disabled={isSaving}
                  className={`text-xs disabled:opacity-60 ${
                    isThemeDark
                      ? "text-zinc-200 hover:text-white"
                      : "text-zinc-700 hover:text-zinc-900"
                  }`}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <span className={isThemeDark ? "text-zinc-700" : "text-zinc-400"}>|</span>
                <Send className={`h-4 w-4 ${isThemeDark ? "text-zinc-300" : "text-zinc-600"}`} />
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => {
                    void runWorkflow("FULL");
                  }}
                  className={`text-xs font-medium disabled:opacity-60 ${
                    isThemeDark
                      ? "text-zinc-100 hover:text-white"
                      : "text-zinc-800 hover:text-zinc-900"
                  }`}
                >
                  {isRunning ? "Running..." : "Run"}
                </button>
              </div>

              <button
                type="button"
                title="Toggle history"
                onClick={() => setIsHistoryOpen((prev) => !prev)}
                className={`pointer-events-auto inline-flex items-center justify-center rounded-lg border p-2 backdrop-blur transition-colors ${
                  isThemeDark
                    ? isHistoryOpen
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-[#1a1a1a]/90 text-zinc-300 hover:bg-[#252525]"
                    : isHistoryOpen
                      ? "border-black/15 bg-black/5 text-zinc-800 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
                      : "border-black/10 bg-white/90 text-zinc-700 shadow-[0_8px_24px_rgba(15,23,42,0.14)] hover:bg-[#f8fafc]"
                }`}
              >
                <History className="h-4 w-4" />
              </button>
            </div>

            <ReactFlow
              className="h-full w-full"
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              panOnDrag={isPanMode}
              selectionOnDrag={isDrawSelectionMode}
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
                color={isThemeDark ? "#2a2a2a" : "#b9c1cf"}
              />
              <MiniMap
                position="bottom-right"
                style={{
                  backgroundColor: isThemeDark
                    ? "rgba(17, 17, 17, 0.9)"
                    : "rgba(255, 255, 255, 0.92)",
                  border: isThemeDark
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "10px",
                  boxShadow: isThemeDark
                    ? "none"
                    : "0 8px 24px rgba(15,23,42,0.14)",
                }}
                nodeStrokeColor={isThemeDark ? "#555" : "#64748b"}
                nodeColor={isThemeDark ? "#222" : "#dbe1ea"}
                maskColor={isThemeDark ? "rgba(0, 0, 0, 0.25)" : "rgba(99, 114, 131, 0.18)"}
              />
            </ReactFlow>

            {nodes.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="-mt-12 text-center">
                  <p className="text-[16px] font-medium tracking-[-0.01em] text-zinc-300">
                    Add a node
                  </p>
                  <p className={`mt-2 text-[14px] font-normal ${isThemeDark ? "text-zinc-500" : "text-zinc-600"}`}>
                    Double click, right click, or press{" "}
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-[14px] font-medium ${
                        isThemeDark
                          ? "border-white/10 bg-[#1b1b1b] text-zinc-300"
                          : "border-black/10 bg-white text-zinc-600"
                      }`}
                    >
                      N
                    </span>
                  </p>
                </div>
              </div>
            ) : null}

            {contextMenu ? (
              <div
                className="absolute z-30 min-w-[160px] rounded-lg border border-white/10 bg-[#141414] p-1 shadow-xl"
                style={{
                  left: contextMenu.x,
                  top: contextMenu.y,
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-white/5"
                  onClick={() => {
                    void runWorkflow("SINGLE", [contextMenu.nodeId]);
                    setContextMenu(null);
                  }}
                >
                  Run This Node
                </button>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm text-red-300 hover:bg-white/5"
                  onClick={() => {
                    removeNode(contextMenu.nodeId);
                    setContextMenu(null);
                  }}
                >
                  Delete
                </button>
              </div>
            ) : null}

            <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2">
              <div
                className={`pointer-events-auto flex items-center gap-1 rounded-2xl border p-2 backdrop-blur-xl ${
                  isThemeDark
                    ? "border-white/10 bg-[#262626]/80"
                    : "border-black/10 bg-white/85 shadow-[0_8px_24px_rgba(15,23,42,0.14)]"
                }`}
              >
                <button
                  type="button"
                  title="Undo"
                  className={`rounded-lg p-2 disabled:opacity-50 ${
                    isThemeDark
                      ? "bg-[#1a1919]/70 text-zinc-200 hover:bg-[#2a2a2a]"
                      : "bg-[#f8fafc] text-zinc-700 hover:bg-[#eef2f7]"
                  }`}
                  disabled={!canUndo}
                  onClick={undo}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Redo"
                  className={`rounded-lg p-2 disabled:opacity-50 ${
                    isThemeDark
                      ? "bg-[#1a1919]/70 text-zinc-200 hover:bg-[#2a2a2a]"
                      : "bg-[#f8fafc] text-zinc-700 hover:bg-[#eef2f7]"
                  }`}
                  disabled={!canRedo}
                  onClick={redo}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsShortcutsOpen(true)}
                  className={`ml-1 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                    isThemeDark
                      ? "bg-[#1a1919]/70 text-zinc-100 hover:bg-[#2a2a2a]"
                      : "bg-[#f8fafc] text-zinc-700 hover:bg-[#eef2f7]"
                  }`}
                >
                  <Keyboard className="h-4 w-4" />
                  Keyboard shortcuts
                </button>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
              <div
                className={`pointer-events-auto flex items-center gap-1 rounded-2xl border p-2 backdrop-blur-xl ${
                  isThemeDark
                    ? "border-white/10 bg-[#262626]/80"
                    : "border-black/10 bg-white/85 shadow-[0_8px_24px_rgba(15,23,42,0.14)]"
                }`}
              >
                <button
                  type="button"
                  title="New node"
                  className={`rounded-lg p-2 ${
                    isThemeDark
                      ? "text-zinc-300 hover:bg-white/10"
                      : "text-zinc-700 hover:bg-black/5"
                  }`}
                  onClick={() => addNodeToCanvasCenter("text")}
                >
                  <Plus className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  title="Draw selections"
                  className={`rounded-lg p-2 hover:bg-white/10 ${
                    isDrawSelectionMode
                      ? isThemeDark
                        ? "bg-white/10 text-zinc-100"
                        : "bg-black/5 text-zinc-900"
                      : isThemeDark
                        ? "text-zinc-300"
                        : "text-zinc-700 hover:bg-black/5"
                  }`}
                  onClick={() => {
                    setIsDrawSelectionMode((prev) => !prev);
                  }}
                >
                  <Circle className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  title="Pan"
                  onClick={() => setIsPanMode((prev) => !prev)}
                  className={`rounded-lg p-2 ${
                    isPanMode
                      ? isThemeDark
                        ? "bg-white/10 text-zinc-100"
                        : "bg-black/5 text-zinc-900"
                      : isThemeDark
                        ? "text-zinc-300 hover:bg-white/10"
                        : "text-zinc-700 hover:bg-black/5"
                  }`}
                >
                  <Hand className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  title="Cut connections"
                  className={`rounded-lg p-2 ${
                    isThemeDark
                      ? "text-zinc-300 hover:bg-white/10"
                      : "text-zinc-700 hover:bg-black/5"
                  }`}
                  onClick={cutSelectedConnections}
                >
                  <Scissors className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  title="Presets"
                  className={`rounded-lg p-2 ${
                    isThemeDark
                      ? "text-zinc-300 hover:bg-white/10"
                      : "text-zinc-700 hover:bg-black/5"
                  }`}
                  onClick={loadSampleWorkflow}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <aside
            className={`shrink-0 overflow-hidden border-l transition-[width,padding,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${rightPanelThemeClass} ${
              isHistoryOpen
                ? "w-[288px] p-4 opacity-100"
                : "w-0 border-transparent p-0 opacity-0 pointer-events-none"
            }`}
          >
            <div
              className={`h-full transition-opacity duration-300 ${
                isHistoryOpen ? "opacity-100 delay-100" : "opacity-0"
              }`}
            >
              <h2
                className={`text-sm font-semibold uppercase tracking-[0.14em] ${
                  isThemeDark ? "text-zinc-500" : "text-zinc-600"
                }`}
              >
                Workflow History
              </h2>
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

              <div
                className={`mt-4 rounded-lg border p-3 text-xs ${
                  isThemeDark
                    ? "border-white/10 bg-[#111111] text-zinc-400"
                    : "border-black/10 bg-white text-zinc-600 shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
                }`}
              >
                {selectedNodes.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      void runWorkflow("PARTIAL", selectedNodes);
                    }}
                    className={`w-full rounded-md border px-2 py-1.5 ${
                      isThemeDark
                        ? "border-white/10 bg-[#1a1a1a] text-zinc-200 hover:bg-[#252525]"
                        : "border-black/10 bg-[#f8fafc] text-zinc-700 hover:bg-[#eef2f7]"
                    }`}
                  >
                    Run Selected ({selectedNodes.length})
                  </button>
                ) : (
                  <span>Select nodes to enable partial run.</span>
                )}
              </div>
            </div>
          </aside>

          {isShortcutsOpen ? (
            <div
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
              onClick={() => setIsShortcutsOpen(false)}
            >
              <div
                className="w-[min(92vw,520px)] rounded-2xl border border-white/10 bg-[#090909] p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-100">Keyboard Shortcuts</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      Quickly navigate and create with these shortcuts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsShortcutsOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#171717] text-zinc-300 hover:bg-[#242424]"
                  >
                    <span className="text-lg leading-none">×</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {shortcutsRows.map((row) => (
                    <div key={row.action} className="flex items-center justify-between rounded-md px-2 py-1.5">
                      <span className="text-sm text-zinc-300">{row.action}</span>
                      <span className="rounded-md border border-white/10 bg-[#171717] px-2 py-0.5 text-xs text-zinc-400">
                        {row.key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

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
