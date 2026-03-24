import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { getCurrentDbUser } from "@/lib/getCurrentDbUser";
import { prisma } from "@/lib/prisma";

const patchRunSchema = z.object({
  status: z.enum(["SUCCESS", "FAILED", "PARTIAL", "RUNNING"]),
  completedAt: z.string().datetime().optional(),
  duration: z.number().int().nonnegative().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const isInternalUpdate = request.headers.get("x-nextflow-internal") === "1";

  let dbUserId: string | null = null;

  if (!isInternalUpdate) {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await getCurrentDbUser();
    if (!dbUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    dbUserId = dbUser.id;
  }

  const parsedBody = patchRunSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return Response.json(
      {
        error: "Invalid request body",
        details: parsedBody.error.flatten(),
      },
      { status: 400 },
    );
  }

  const existingRun = await prisma.workflowRun.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!existingRun) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  if (!isInternalUpdate && existingRun.userId !== dbUserId) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  const completedAt =
    parsedBody.data.completedAt !== undefined
      ? new Date(parsedBody.data.completedAt)
      : parsedBody.data.status === "RUNNING"
        ? null
        : new Date();

  const run = await prisma.workflowRun.update({
    where: { id },
    data: {
      status: parsedBody.data.status,
      completedAt,
      duration: parsedBody.data.duration ?? null,
    },
    include: {
      nodeRuns: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  return Response.json(run);
}
