import type { Edge, Node } from "reactflow";
import { create } from "zustand";

type WorkflowRunStatus = "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL";
type WorkflowRunScope = "FULL" | "PARTIAL" | "SINGLE";
type NodeRunStatus = "RUNNING" | "SUCCESS" | "FAILED";

type WorkflowSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

type HistoryState = {
  past: WorkflowSnapshot[];
  future: WorkflowSnapshot[];
};

type GraphState = {
  nodes: Node[];
  edges: Edge[];
};

export type NodeRun = {
  id: string;
  workflowRunId: string;
  nodeId: string;
  nodeType: string;
  status: NodeRunStatus;
  inputsUsed: unknown;
  outputGenerated: string | null;
  executionTime: number | null;
  error: string | null;
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  userId: string;
  status: WorkflowRunStatus;
  scope: WorkflowRunScope;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  nodeRuns?: NodeRun[];
};

type WorkflowStore = {
  nodes: Node[];
  edges: Edge[];
  workflowRunHistory: WorkflowRun[];
  isRunning: boolean;
  selectedNodes: string[];
  canUndo: boolean;
  canRedo: boolean;
  setNodes: (nodes: Node[], options?: { recordHistory?: boolean }) => void;
  setGraph: (
    graph: GraphState,
    options?: { recordHistory?: boolean; clearFuture?: boolean }
  ) => void;
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  removeNode: (nodeId: string) => void;
  setEdges: (edges: Edge[], options?: { recordHistory?: boolean }) => void;
  setHistory: (runs: WorkflowRun[]) => void;
  setRunning: (isRunning: boolean) => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  undo: () => void;
  redo: () => void;
};

const MAX_HISTORY_SIZE = 20;

function clampHistory(snapshots: WorkflowSnapshot[]) {
  if (snapshots.length <= MAX_HISTORY_SIZE) {
    return snapshots;
  }

  return snapshots.slice(snapshots.length - MAX_HISTORY_SIZE);
}

function captureSnapshot(state: GraphState): WorkflowSnapshot {
  return {
    nodes: state.nodes,
    edges: state.edges,
  };
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  nodes: [],
  edges: [],
  workflowRunHistory: [],
  isRunning: false,
  selectedNodes: [],
  canUndo: false,
  canRedo: false,
  history: {
    past: [],
    future: [],
  } as HistoryState,

  setGraph: ({ nodes, edges }, options) =>
    set((state) => {
      const recordHistory = options?.recordHistory ?? true;
      const clearFuture = options?.clearFuture ?? true;

      if (!recordHistory) {
        const nextFuture = clearFuture ? [] : (state as WorkflowStore & { history: HistoryState }).history.future;
        return {
          nodes,
          edges,
          canUndo: (state as WorkflowStore & { history: HistoryState }).history.past.length > 0,
          canRedo: nextFuture.length > 0,
          history: {
            ...(state as WorkflowStore & { history: HistoryState }).history,
            future: nextFuture,
          },
        } as Partial<WorkflowStore & { history: HistoryState }>;
      }

      const currentState = state as WorkflowStore & { history: HistoryState };
      const currentSnapshot = captureSnapshot(state);
      const nextPast = clampHistory([...currentState.history.past, currentSnapshot]);
      const nextFuture = clearFuture ? [] : currentState.history.future;

      return {
        nodes,
        edges,
        canUndo: nextPast.length > 0,
        canRedo: nextFuture.length > 0,
        history: {
          past: nextPast,
          future: nextFuture,
        },
      } as Partial<WorkflowStore & { history: HistoryState }>;
    }),

  setNodes: (nodes, options) =>
    set((state) => {
      const current = state as WorkflowStore & { history: HistoryState };
      const recordHistory = options?.recordHistory ?? true;

      if (!recordHistory) {
        return {
          nodes,
        };
      }

      const nextPast = clampHistory([...current.history.past, captureSnapshot(state)]);
      return {
        nodes,
        canUndo: nextPast.length > 0,
        canRedo: false,
        history: {
          past: nextPast,
          future: [],
        },
      } as Partial<WorkflowStore & { history: HistoryState }>;
    }),

  addNode: (node) =>
    set((state) => ({
      canUndo: true,
      canRedo: false,
      history: {
        past: clampHistory([...(state as WorkflowStore & { history: HistoryState }).history.past, captureSnapshot(state)]),
        future: [],
      },
      nodes: [...state.nodes, node],
    }) as Partial<WorkflowStore & { history: HistoryState }>),

  updateNode: (nodeId, updates) =>
    set((state) => ({
      canUndo: true,
      canRedo: false,
      history: {
        past: clampHistory([...(state as WorkflowStore & { history: HistoryState }).history.past, captureSnapshot(state)]),
        future: [],
      },
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
    }) as Partial<WorkflowStore & { history: HistoryState }>),

  removeNode: (nodeId) =>
    set((state) => ({
      canUndo: true,
      canRedo: false,
      history: {
        past: clampHistory([...(state as WorkflowStore & { history: HistoryState }).history.past, captureSnapshot(state)]),
        future: [],
      },
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodes: state.selectedNodes.filter((selectedId) => selectedId !== nodeId),
    }) as Partial<WorkflowStore & { history: HistoryState }>),

  setEdges: (edges, options) =>
    set((state) => {
      const current = state as WorkflowStore & { history: HistoryState };
      const recordHistory = options?.recordHistory ?? true;

      if (!recordHistory) {
        return {
          edges,
        };
      }

      const nextPast = clampHistory([...current.history.past, captureSnapshot(state)]);
      return {
        edges,
        canUndo: nextPast.length > 0,
        canRedo: false,
        history: {
          past: nextPast,
          future: [],
        },
      } as Partial<WorkflowStore & { history: HistoryState }>;
    }),

  setHistory: (runs) => set({ workflowRunHistory: runs }),

  setRunning: (isRunning) => set({ isRunning }),

  setSelectedNodes: (nodeIds) =>
    set((state) => {
      if (
        state.selectedNodes.length === nodeIds.length &&
        state.selectedNodes.every((id, index) => id === nodeIds[index])
      ) {
        return state;
      }

      return { selectedNodes: nodeIds };
    }),

  undo: () =>
    set((state) => {
      const current = state as WorkflowStore & { history: HistoryState };
      if (current.history.past.length === 0) {
        return state;
      }

      const previous = current.history.past[current.history.past.length - 1];
      const nextPast = current.history.past.slice(0, -1);
      const nextFuture = [captureSnapshot(state), ...current.history.future];

      return {
        nodes: previous.nodes,
        edges: previous.edges,
        canUndo: nextPast.length > 0,
        canRedo: nextFuture.length > 0,
        history: {
          past: nextPast,
          future: nextFuture,
        },
      } as Partial<WorkflowStore & { history: HistoryState }>;
    }),

  redo: () =>
    set((state) => {
      const current = state as WorkflowStore & { history: HistoryState };
      if (current.history.future.length === 0) {
        return state;
      }

      const next = current.history.future[0];
      const remainingFuture = current.history.future.slice(1);
      const nextPast = clampHistory([...current.history.past, captureSnapshot(state)]);

      return {
        nodes: next.nodes,
        edges: next.edges,
        canUndo: nextPast.length > 0,
        canRedo: remainingFuture.length > 0,
        history: {
          past: nextPast,
          future: remainingFuture,
        },
      } as Partial<WorkflowStore & { history: HistoryState }>;
    }),
}));
