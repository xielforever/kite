import Link from "next/link";
import { acceptInvitationAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { roleLabels } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await requireUser();
  const { token } = await params;
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    include: { workspace: true },
  });
  const invalid = !invitation || invitation.acceptedAt || invitation.expiresAt < new Date();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{invalid ? "邀请不可用" : `加入 ${invitation.workspace.name}`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invalid ? (
            <>
              <p className="text-sm text-muted-foreground">该邀请不存在、已接受或已过期。</p>
              <Button asChild>
                <Link href="/workspaces">返回工作区</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                角色：{roleLabels[invitation.role]}。接受后你将进入该工作区。
              </p>
              <form
                action={async () => {
                  "use server";
                  await acceptInvitationAction(token);
                }}
              >
                <Button type="submit">接受邀请</Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
