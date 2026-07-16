import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

// Block a user.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (id === user.id) {
    return NextResponse.json({ error: "You can't block yourself." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: id } },
    update: {},
    create: { blockerId: user.id, blockedId: id },
  });
  return NextResponse.json({ ok: true, blocked: true });
}

// Unblock a user.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  await prisma.block.deleteMany({ where: { blockerId: user.id, blockedId: id } });
  return NextResponse.json({ ok: true, blocked: false });
}
