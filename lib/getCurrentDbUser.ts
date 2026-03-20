import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

export async function getCurrentDbUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  const existingUser = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (existingUser) {
    return existingUser;
  }

  const clerkUser = await currentUser();
  const fallbackEmail = `${clerkId}@clerk.local`;
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    fallbackEmail;

  return prisma.user.create({
    data: {
      clerkId,
      email,
    },
  });
}
