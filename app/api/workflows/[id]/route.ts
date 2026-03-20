import { auth } from "@clerk/nextjs/server";

import { getCurrentDbUser } from "@/lib/getCurrentDbUser";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await getCurrentDbUser();

  if (!dbUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const workflow = await prisma.workflow.findFirst({
    where: {
      id,
      userId: dbUser.id,
    },
  });

  if (!workflow) {
    return Response.json({ error: "Workflow not found" }, { status: 404 });
  }

  return Response.json(workflow);
}
