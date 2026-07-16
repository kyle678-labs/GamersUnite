import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { LOBBY_HOURS, PLATFORMS, REGIONS, SKILL_LEVELS } from "@/lib/constants";
import { cleanupExpiredChannels } from "@/lib/matchmaking";
import { botConfigured, isGuildMember } from "@/lib/discord";
import { lobbyInclude, serializeLobby } from "@/lib/serialize";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to start a party." }, { status: 401 });
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

  const body = await req.json().catch(() => null);
  const gameSlug = String(body?.gameSlug ?? "");
  const game = await prisma.game.findUnique({ where: { slug: gameSlug } });
  if (!game) {
    return NextResponse.json({ error: "Unknown game." }, { status: 400 });
  }

  const size = Number(body?.size); // cap
  const minSize = Number(body?.minSize ?? 2); // voice opens at this count
  if (!Number.isInteger(size) || size < 2 || size > game.maxPlayers) {
    return NextResponse.json(
      { error: `Party size must be between 2 and ${game.maxPlayers}.` },
      { status: 400 }
    );
  }
  if (!Number.isInteger(minSize) || minSize < 2 || minSize > size) {
    return NextResponse.json(
      { error: "The voice-start count must be between 2 and the party cap." },
      { status: 400 }
    );
  }

  const mode = String(body?.mode ?? "").trim().slice(0, 40) || null;
  const platform = PLATFORMS.includes(body?.platform) ? body.platform : null;
  const region = REGIONS.includes(body?.region) ? body.region : null;
  const skillLevel = SKILL_LEVELS.includes(body?.skillLevel) ? body.skillLevel : null;
  const micRequired = !!body?.micRequired;
  const note = String(body?.note ?? "").trim().slice(0, 200) || null;

  // Community-sourced modes: any new mode a host types in is remembered for
  // this game and suggested to future hosts — the catalog teaches itself.
  if (mode) {
    await prisma.gameMode.upsert({
      where: { gameId_name: { gameId: game.id, name: mode } },
      update: {},
      create: { gameId: game.id, name: mode, source: "community" },
    });
  }

  const lobby = await prisma.lobby.create({
    data: {
      gameId: game.id,
      hostId: user.id,
      mode,
      platform,
      region,
      skillLevel,
      micRequired,
      size,
      minSize,
      note,
      expiresAt: new Date(Date.now() + LOBBY_HOURS * 60 * 60 * 1000),
      members: { create: [{ userId: user.id }] },
    },
    include: lobbyInclude,
  });

  return NextResponse.json({ lobby: serializeLobby(lobby, user.id) });
}
