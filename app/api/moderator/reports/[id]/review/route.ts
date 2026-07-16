import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isModerator, markReportReviewed } from "@/lib/moderation";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!isModerator(user)) {
    return NextResponse.json({ error: "Moderators only." }, { status: 403 });
  }
  const { id } = await params;
  await markReportReviewed(id, user!.id);
  return NextResponse.json({ ok: true });
}
