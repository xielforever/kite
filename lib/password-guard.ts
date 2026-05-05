import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function enforcePasswordReset() {
  const session = await auth();
  if (!session?.user?.id) return;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  if (!user) {
    redirect("/api/auth/session-expired");
  }
  if (user?.mustChangePassword) {
    redirect("/setup/change-password");
  }
}
