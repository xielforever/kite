import { NextResponse } from "next/server";
import { moveIssue } from "@/lib/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await moveIssue(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 400 },
    );
  }
}
