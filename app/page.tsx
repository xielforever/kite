import { redirect } from "next/navigation";
import { getSetupStatus } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const status = await getSetupStatus();
  if (!status.initialized) redirect("/setup");
  redirect("/workspaces");
}
