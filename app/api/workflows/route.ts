import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/lib/getCurrentDbUser";

const saveWorkflowSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).max(200),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedBody = saveWorkflowSchema.safeParse(await request.json());

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

  const { id, name, nodes, edges } = parsedBody.data;

  if (id) {
    const existingWorkflow = await prisma.workflow.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
    });

    if (existingWorkflow) {
      const updatedWorkflow = await prisma.workflow.update({
        where: { id: existingWorkflow.id },
        data: {
          name,
          nodes,
          edges,
        },
      });

      return Response.json(updatedWorkflow);
    }
  }

  const createdWorkflow = await prisma.workflow.create({
    data: {
      ...(id ? { id } : {}),
      userId: dbUser.id,
      name,
      nodes,
      edges,
    },
  });

  return Response.json(createdWorkflow, { status: 201 });
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await getCurrentDbUser();

  if (!dbUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      userId: dbUser.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return Response.json(workflows);
}
