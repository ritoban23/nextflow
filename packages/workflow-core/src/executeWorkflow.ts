import type { InputJsonValue } from "@prisma/client/runtime/client";
import { runs, tasks } from "@trigger.dev/sdk";
import type { Edge, Node } from "reactflow";

import { prisma } from "@/lib/prisma";

type RunScope = "FULL" | "PARTIAL" | "SINGLE";

type ExecuteWorkflowParams = {
  nodes: Node[];
  edges: Edge[];
  scope: RunScope;
  selectedNodeIds?: string[];
  workflowId: string;
  userId: string;
  workflowRunId?: string;
};

type NodeExecutionResult = {
  nodeId: string;
  status: "SUCCESS" | "FAILED";
  output: string | null;
  error?: string;
};

type FinalRunStatus = "SUCCESS" | "FAILED" | "PARTIAL";

function resolveAppBaseUrl() {
  const explicitBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicitBase) {
    return explicitBase.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const normalized = vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`;
    return normalized.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

async function finalizeWorkflowRunStatus(
  workflowRunId: string,
  status: FinalRunStatus,
  duration: number,
) {
  const completedAt = new Date();
  const baseUrl = resolveAppBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/runs/${workflowRunId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-nextflow-internal": "1",
      },
      body: JSON.stringify({
        status,
        completedAt: completedAt.toISOString(),
        duration,
      }),
    });

    if (response.ok) {
      return;
    }
  } catch {
    // Fallback to direct DB write when internal HTTP callback is unavailable.
  }

  await prisma.workflowRun.update({
    where: { id: workflowRunId },
    data: {
      status,
      completedAt,
      duration,
    },
  });
}

function collectNodeIdsForScope(
  scope: RunScope,
  nodes: Node[],
  edges: Edge[],
  selectedNodeIds?: string[],
): Set<string> {
  const allNodeIds = new Set(nodes.map((node) => node.id));

  if (scope === "FULL") {
    return allNodeIds;
  }

  const requested = (selectedNodeIds ?? []).filter((id) => allNodeIds.has(id));
  if (requested.length === 0) {
    return new Set();
  }

  if (scope === "SINGLE") {
    return new Set([requested[0]]);
  }

  const included = new Set<string>(requested);
  const incomingByTarget = new Map<string, string[]>();

  for (const edge of edges) {
    if (!incomingByTarget.has(edge.target)) {
      incomingByTarget.set(edge.target, []);
    }
    incomingByTarget.get(edge.target)?.push(edge.source);
  }

  const queue = [...requested];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) {
      continue;
    }

    const upstream = incomingByTarget.get(nodeId) ?? [];
    for (const sourceId of upstream) {
      if (included.has(sourceId)) {
        continue;
      }

      included.add(sourceId);
      queue.push(sourceId);
    }
  }

  return included;
}

function buildExecutionLevels(nodes: Node[], edges: Edge[]) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
    indegree.set(node.id, 0);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue;
    }

    outgoing.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  let currentLevel = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([nodeId]) => nodeId);

  const levels: string[][] = [];
  let visitedCount = 0;

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    visitedCount += currentLevel.length;

    const nextLevel: string[] = [];

    for (const nodeId of currentLevel) {
      for (const targetId of outgoing.get(nodeId) ?? []) {
        const nextDegree = (indegree.get(targetId) ?? 0) - 1;
        indegree.set(targetId, nextDegree);
        if (nextDegree === 0) {
          nextLevel.push(targetId);
        }
      }
    }

    currentLevel = nextLevel;
  }

  if (visitedCount !== nodes.length) {
    throw new Error("Cannot execute workflow with cyclic graph");
  }

  return levels;
}

function parseNumberInput(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function parseStringInput(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return fallback;
  }

  return String(value);
}

async function executeNode(
  node: Node,
  incomingEdges: Edge[],
  outputByNodeId: Map<string, string>,
  workflowRunId: string,
): Promise<NodeExecutionResult> {
  const startedAt = Date.now();

  const inputByHandle = new Map<string, string[]>();
  for (const edge of incomingEdges) {
    const upstreamOutput = outputByNodeId.get(edge.source);
    if (typeof upstreamOutput !== "string") {
      continue;
    }

    const handleId = edge.targetHandle ?? "default";
    const existing = inputByHandle.get(handleId) ?? [];
    existing.push(upstreamOutput);
    inputByHandle.set(handleId, existing);
  }

  const nodeData = (node.data ?? {}) as Record<string, unknown>;
  const inputsUsed = {
    handles: Object.fromEntries(inputByHandle.entries()),
    nodeData,
  };

  await prisma.nodeRun.create({
    data: {
      workflowRunId,
      nodeId: node.id,
      nodeType: node.type ?? "unknown",
      status: "RUNNING",
      inputsUsed: inputsUsed as InputJsonValue,
    },
  });

  try {
    const type = node.type ?? "";

    if (type === "text") {
      const output = parseStringInput(nodeData.text, "");
      await prisma.nodeRun.updateMany({
        where: { workflowRunId, nodeId: node.id },
        data: {
          status: "SUCCESS",
          outputGenerated: output,
          executionTime: Date.now() - startedAt,
          error: null,
        },
      });
      return { nodeId: node.id, status: "SUCCESS", output };
    }

    if (type === "uploadImage") {
      const output = parseStringInput(nodeData.imageUrl, "");
      if (!output) {
        throw new Error("Upload Image node has no uploaded image URL");
      }

      await prisma.nodeRun.updateMany({
        where: { workflowRunId, nodeId: node.id },
        data: {
          status: "SUCCESS",
          outputGenerated: output,
          executionTime: Date.now() - startedAt,
          error: null,
        },
      });
      return { nodeId: node.id, status: "SUCCESS", output };
    }

    if (type === "uploadVideo") {
      const output = parseStringInput(nodeData.videoUrl, "");
      if (!output) {
        throw new Error("Upload Video node has no uploaded video URL");
      }

      await prisma.nodeRun.updateMany({
        where: { workflowRunId, nodeId: node.id },
        data: {
          status: "SUCCESS",
          outputGenerated: output,
          executionTime: Date.now() - startedAt,
          error: null,
        },
      });
      return { nodeId: node.id, status: "SUCCESS", output };
    }

    if (type === "llm") {
      const model = parseStringInput(nodeData.model, "gemini-2.5-flash");
      const systemPrompt =
        inputByHandle.get("system_prompt")?.[0] ??
        parseStringInput(nodeData.systemPrompt, "");
      const userMessage =
        inputByHandle.get("user_message")?.[0] ??
        parseStringInput(nodeData.userMessage, "");
      const imageUrls = inputByHandle.get("images") ?? [];

      if (!userMessage.trim()) {
        throw new Error("LLM node requires a user_message input");
      }

      const handle = await tasks.trigger("llm-task", {
        model,
        systemPrompt,
        userMessage,
        imageUrls,
        workflowRunId,
        nodeId: node.id,
      });

      const taskRun = await runs.poll(handle.id, { pollIntervalMs: 800 });
      if (!taskRun.isSuccess || typeof taskRun.output?.output !== "string") {
        throw new Error(taskRun.error?.message ?? "LLM task failed");
      }

      await prisma.nodeRun.updateMany({
        where: { workflowRunId, nodeId: node.id },
        data: {
          status: "SUCCESS",
          outputGenerated: taskRun.output.output,
          executionTime: Date.now() - startedAt,
          error: null,
        },
      });

      return {
        nodeId: node.id,
        status: "SUCCESS",
        output: taskRun.output.output,
      };
    }

    if (type === "cropImage") {
      const imageUrl =
        inputByHandle.get("image_url")?.[0] ??
        parseStringInput(nodeData.imageUrl, "");
      if (!imageUrl) {
        throw new Error("Crop Image node requires image_url input");
      }

      const handle = await tasks.trigger("crop-image-task", {
        imageUrl,
        xPercent: parseNumberInput(
          inputByHandle.get("x_percent")?.[0] ?? nodeData.xPercent,
          0,
        ),
        yPercent: parseNumberInput(
          inputByHandle.get("y_percent")?.[0] ?? nodeData.yPercent,
          0,
        ),
        widthPercent: parseNumberInput(
          inputByHandle.get("width_percent")?.[0] ?? nodeData.widthPercent,
          100,
        ),
        heightPercent: parseNumberInput(
          inputByHandle.get("height_percent")?.[0] ?? nodeData.heightPercent,
          100,
        ),
        workflowRunId,
        nodeId: node.id,
      });

      const taskRun = await runs.poll(handle.id, { pollIntervalMs: 800 });
      if (!taskRun.isSuccess || typeof taskRun.output?.output !== "string") {
        throw new Error(taskRun.error?.message ?? "Crop Image task failed");
      }

      await prisma.nodeRun.updateMany({
        where: { workflowRunId, nodeId: node.id },
        data: {
          status: "SUCCESS",
          outputGenerated: taskRun.output.output,
          executionTime: Date.now() - startedAt,
          error: null,
        },
      });

      return {
        nodeId: node.id,
        status: "SUCCESS",
        output: taskRun.output.output,
      };
    }

    if (type === "extractFrame") {
      const videoUrl =
        inputByHandle.get("video_url")?.[0] ??
        parseStringInput(nodeData.videoUrl, "");
      if (!videoUrl) {
        throw new Error("Extract Frame node requires video_url input");
      }

      const timestamp =
        inputByHandle.get("timestamp")?.[0] ??
        parseStringInput(nodeData.timestamp, "0");

      const handle = await tasks.trigger("extract-frame-task", {
        videoUrl,
        timestamp,
        workflowRunId,
        nodeId: node.id,
      });

      const taskRun = await runs.poll(handle.id, { pollIntervalMs: 800 });
      if (!taskRun.isSuccess || typeof taskRun.output?.output !== "string") {
        throw new Error(taskRun.error?.message ?? "Extract Frame task failed");
      }

      await prisma.nodeRun.updateMany({
        where: { workflowRunId, nodeId: node.id },
        data: {
          status: "SUCCESS",
          outputGenerated: taskRun.output.output,
          executionTime: Date.now() - startedAt,
          error: null,
        },
      });

      return {
        nodeId: node.id,
        status: "SUCCESS",
        output: taskRun.output.output,
      };
    }

    throw new Error(`Unsupported node type: ${type}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown execution error";

    await prisma.nodeRun.updateMany({
      where: { workflowRunId, nodeId: node.id },
      data: {
        status: "FAILED",
        executionTime: Date.now() - startedAt,
        error: message,
      },
    });

    return {
      nodeId: node.id,
      status: "FAILED",
      output: null,
      error: message,
    };
  }
}

export async function executeWorkflow(params: ExecuteWorkflowParams) {
  const scopedNodeIds = collectNodeIdsForScope(
    params.scope,
    params.nodes,
    params.edges,
    params.selectedNodeIds,
  );

  if (scopedNodeIds.size === 0) {
    throw new Error("No nodes available for the selected run scope");
  }

  const scopedNodes = params.nodes.filter((node) => scopedNodeIds.has(node.id));
  const scopedEdges = params.edges.filter(
    (edge) => scopedNodeIds.has(edge.source) && scopedNodeIds.has(edge.target),
  );

  const workflowRun = params.workflowRunId
    ? await prisma.workflowRun.update({
        where: { id: params.workflowRunId },
        data: {
          status: "RUNNING",
          completedAt: null,
          duration: null,
        },
      })
    : await prisma.workflowRun.create({
        data: {
          workflowId: params.workflowId,
          userId: params.userId,
          status: "RUNNING",
          scope: params.scope,
        },
      });

  const runStartedAt = Date.now();
  const outputByNodeId = new Map<string, string>();

  try {
    const levels = buildExecutionLevels(scopedNodes, scopedEdges);

    for (const level of levels) {
      const levelResults = await Promise.all(
        level.map(async (nodeId) => {
          const node = scopedNodes.find((item) => item.id === nodeId);
          if (!node) {
            return {
              nodeId,
              status: "FAILED" as const,
              output: null,
              error: "Node not found in scoped execution graph",
            };
          }

          const incoming = scopedEdges.filter(
            (edge) => edge.target === node.id,
          );
          const dependenciesFailed = incoming.some(
            (edge) => !outputByNodeId.has(edge.source),
          );

          if (dependenciesFailed) {
            const errorMessage = "One or more upstream dependencies failed";
            await prisma.nodeRun.create({
              data: {
                workflowRunId: workflowRun.id,
                nodeId: node.id,
                nodeType: node.type ?? "unknown",
                status: "FAILED",
                inputsUsed: {
                  reason: errorMessage,
                },
                executionTime: 0,
                error: errorMessage,
              },
            });

            return {
              nodeId: node.id,
              status: "FAILED" as const,
              output: null,
              error: errorMessage,
            };
          }

          return executeNode(node, incoming, outputByNodeId, workflowRun.id);
        }),
      );

      for (const result of levelResults) {
        if (result.status === "SUCCESS" && typeof result.output === "string") {
          outputByNodeId.set(result.nodeId, result.output);
        }
      }
    }

    const totalNodes = scopedNodes.length;
    const successfulNodes = outputByNodeId.size;
    const failedNodes = totalNodes - successfulNodes;

    const status =
      failedNodes === 0
        ? "SUCCESS"
        : successfulNodes === 0
          ? "FAILED"
          : "PARTIAL";

    await finalizeWorkflowRunStatus(
      workflowRun.id,
      status,
      Date.now() - runStartedAt,
    );

    return { workflowRunId: workflowRun.id, status };
  } catch (error) {
    await finalizeWorkflowRunStatus(
      workflowRun.id,
      "FAILED",
      Date.now() - runStartedAt,
    );

    throw error;
  }
}
