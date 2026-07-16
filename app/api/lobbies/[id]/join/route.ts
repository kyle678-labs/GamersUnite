import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { cleanupExpiredChannels, handleLobbyJoin, lobbyIsActive } from "@/lib/matchmaking";
import { botConfigured, isGuildMember } from "@/lib/discord";
import { getBlockSet } from "@/lib/social";
import { lobbyInclude, serializeLobby } from "@/lib/serialize";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to join a party." }, { status: 401 });
  }

  const lobby = await prisma.lobby.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!lobby) {
    return NextResponse.json({ error: "Party not found." }, { status: 404 });
  }
  if (!lobbyIsActive(lobby)) {
    return NextResponse.json({ error: "This party has ended." }, { status: 400 });
  }

  const alreadyIn = lobby.members.some((m) => m.userId === user.id);
  if (!alreadyIn) {
    if (lobby.status === "full" || lobby.members.length >= lobby.size) {
      return NextResponse.json({ error: "This party is already full!" }, { status: 400 });
    }
    // Can't join a party that has someone you've blocked (or who blocked you).
    const blockSet = await getBlockSet(user.id);
    if (lobby.members.some((m) => blockSet.has(m.userId))) {
      return NextResponse.json(
        { error: "You can't join this party — it includes someone you've blocked." },
        { status: 403 }
      );
    }
    // Voice rooms live on our Discord server — you have to be in it to party.
    if (botConfigured() && (!user.discordId || !(await isGuildMember(user.discordId)))) {
      return NextResponse.json(
        {
          error: "You need to join our Discord server first — that's where your party's voice room lives!",
          code: "not_in_guild",
          inviteUrl: process.env.DISCORD_INVITE_URL || null,
        },
        { status: 403 }
      );
    }
    await cleanupExpiredChannels().catch(() => {});
    await prisma.lobbyMember.create({ data: { lobbyId: id, userId: user.id } });
    await handleLobbyJoin(id, user.id);
  }

  const updated = await prisma.lobby.findUniqueOrThrow({
    where: { id },
    include: lobbyInclude,
  });
  return NextResponse.json({ lobby: serializeLobby(updated, user.id) });
}
