import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { banUser, isModerator, unbanUser } from "@/lib/moderation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!isModerator(user)) {
    return NextResponse.json({ error: "Moderators only." }, { status: 403 });
  }
  const { id } = await params;
  if (id === user!.id) {
    return NextResponse.json({ error: "You can't ban yourself." }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const reason = body?.reason ? String(body.reason) : null;
  await banUser(id, reason, user!.id);
  return NextResponse.json({ ok: true, banned: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!isModerator(user)) {
    return NextResponse.json({ error: "Moderators only." }, { status: 403 });
  }
  const { id } = await params;
  await unbanUser(id);
  return NextResponse.json({ ok: true, banned: false });
}
