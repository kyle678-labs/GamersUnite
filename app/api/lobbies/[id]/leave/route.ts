import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { releaseVoiceChannel } from "@/lib/matchmaking";
import { removeMemberFromChannel } from "@/lib/discord";
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

  const lobby = await prisma.lobby.findUnique({
    where: { id },
    include: { members: { orderBy: { joinedAt: "asc" } } },
  });
  if (!lobby) {
    return NextResponse.json({ error: "Party not found." }, { status: 404 });
  }

  await prisma.lobbyMember.deleteMany({ where: { lobbyId: id, userId: user.id } });
  const remaining = lobby.members.filter((m) => m.userId !== user.id);

  if (remaining.length === 0) {
    // Last one out turns off the lights.
    await prisma.lobby.update({ where: { id }, data: { status: "closed" } });
    await releaseVoiceChannel(id);
  } else {
    const channel = await prisma.voiceChannel.findUnique({ where: { lobbyId: id } });
    const data: { status?: string; hostId?: string } = {};
    // A party that already has its voice channel stays live (and joinable
    // again); one that never started stays open.
    if (lobby.status !== "closed") data.status = channel ? "live" : "open";
    // Host left? Longest-standing member takes over.
    if (lobby.hostId === user.id) data.hostId = remaining[0].userId;
    await prisma.lobby.update({ where: { id }, data });
    // Revoke the leaver's voice + text access (best effort).
    if (channel?.managed && user.discordId) {
      await removeMemberFromChannel(channel.id, user.discordId);
      if (channel.textChannelId) {
        await removeMemberFromChannel(channel.textChannelId, user.discordId);
      }
    }
  }

  const updated = await prisma.lobby.findUniqueOrThrow({
    where: { id },
    include: lobbyInclude,
  });
  return NextResponse.json({ lobby: serializeLobby(updated, user.id) });
}
