import { NextResponse } from "next/server";
import { moveIssue } from "@/lib/actions";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: "请求不被允许" }, { status: 403 });
    }
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  try {
    const body = await request.json();
    await moveIssue(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "操作失败" }, { status: 400 });
  }
}
