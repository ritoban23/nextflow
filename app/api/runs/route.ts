import { auth } from "@clerk/nextjs/server";
import type { Edge, Node } from "reactflow";
import { z } from "zod";

import { getCurrentDbUser } from "@/lib/getCurrentDbUser";
import { prisma } from "@/lib/prisma";
import { executeWorkflow } from "@/lib/executeWorkflow";

const createRunSchema = z.object({
  workflowId: z.string().cuid(),
  scope: z.enum(["FULL", "PARTIAL", "SINGLE"]),
  nodeIds: z.array(z.string()).optional(),
});

const runsQuerySchema = z.object({
  workflowId: z.string().cuid(),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = createRunSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return Response.json(
      {
        error: "Invalid request body",
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    );
  }

  const dbUser = await getCurrentDbUser();

  if (!dbUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: parsedBody.data.workflowId,
      userId: dbUser.id,
    },
  });

  if (!workflow) {
    return Response.json({ error: "Workflow not found" }, { status: 404 });
  }

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      userId: dbUser.id,
      status: "RUNNING",
      scope: parsedBody.data.scope,
    },
  });

  const workflowNodes = Array.isArray(workflow.nodes)
    ? (workflow.nodes as unknown[])
    : [];
  const workflowEdges = Array.isArray(workflow.edges)
    ? (workflow.edges as unknown[])
    : [];

  const selectedNodeIds = parsedBody.data.nodeIds;

  if (
    parsedBody.data.scope !== "FULL" &&
    (!selectedNodeIds || selectedNodeIds.length === 0)
  ) {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        duration: 0,
      },
    });

    return Response.json(
      {
        error: "nodeIds are required for PARTIAL or SINGLE run scope",
      },
      { status: 400 }
    );
  }

  void executeWorkflow({
    nodes: workflowNodes as Node[],
    edges: workflowEdges as Edge[],
    scope: parsedBody.data.scope,
    selectedNodeIds,
    workflowId: workflow.id,
    userId: dbUser.id,
    workflowRunId: run.id,
  }).catch(async () => {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });
  });

  return Response.json({ workflowRunId: run.id }, { status: 201 });
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await getCurrentDbUser();

  if (!dbUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedQuery = runsQuerySchema.safeParse({
    workflowId: url.searchParams.get("workflowId"),
  });

  if (!parsedQuery.success) {
    return Response.json(
      {
        error: "Invalid query string",
        details: parsedQuery.error.flatten(),
      },
      { status: 400 }
    );
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: parsedQuery.data.workflowId,
      userId: dbUser.id,
    },
    select: { id: true },
  });

  if (!workflow) {
    return Response.json({ error: "Workflow not found" }, { status: 404 });
  }

  const runs = await prisma.workflowRun.findMany({
    where: {
      workflowId: workflow.id,
      userId: dbUser.id,
    },
    include: {
      nodeRuns: {
        orderBy: {
          id: "asc",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  return Response.json(runs);
}
