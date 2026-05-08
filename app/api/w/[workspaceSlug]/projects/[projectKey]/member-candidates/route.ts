import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAdmin } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string; projectKey: string }> },
) {
  const { workspaceSlug, projectKey } = await params;
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ users: [] });

  try {
    const { project } = await requireProjectAdmin(workspaceSlug, projectKey);
    const users = await prisma.user.findMany({
      where: {
        projectMemberships: { none: { projectId: project.id } },
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      orderBy: [{ email: "asc" }],
      take: 8,
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}
