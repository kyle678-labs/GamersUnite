import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { releaseVoiceChannel } from "@/lib/matchmaking";
import { lobbyInclude, serializeLobby } from "@/lib/serialize";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const lobby = await prisma.lobby.findUnique({ where: { id } });
  if (!lobby) {
    return NextResponse.json({ error: "Party not found." }, { status: 404 });
  }
  if (lobby.hostId !== user.id) {
    return NextResponse.json({ error: "Only the host can close the party." }, { status: 403 });
  }

  await prisma.lobby.update({ where: { id }, data: { status: "closed" } });
  await releaseVoiceChannel(id);

  const updated = await prisma.lobby.findUniqueOrThrow({
    where: { id },
    include: lobbyInclude,
  });
  return NextResponse.json({ lobby: serializeLobby(updated, user.id) });
}
