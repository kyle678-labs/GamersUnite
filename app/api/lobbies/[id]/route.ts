import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getBlockSet, isLobbyHiddenFrom } from "@/lib/social";
import { lobbyInclude, serializeLobby } from "@/lib/serialize";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [user, lobby] = await Promise.all([
    getUser(),
    prisma.lobby.findUnique({ where: { id }, include: lobbyInclude }),
  ]);
  if (!lobby) {
    return NextResponse.json({ error: "Party not found." }, { status: 404 });
  }
  if (user) {
    const blockSet = await getBlockSet(user.id);
    if (isLobbyHiddenFrom(lobby.members, blockSet, user.id)) {
      return NextResponse.json({ error: "Party not found." }, { status: 404 });
    }
  }
  return NextResponse.json({ lobby: serializeLobby(lobby, user?.id) });
}
