import type { Game, Lobby, LobbyMember, User, VoiceChannel } from "@prisma/client";
import type { LobbyJson } from "./types";

export type LobbyWithRelations = Lobby & {
  game: Game;
  host: User;
  members: (LobbyMember & { user: User })[];
  voiceChannel: VoiceChannel | null;
};

export const lobbyInclude = {
  game: true,
  host: true,
  members: { include: { user: true }, orderBy: { joinedAt: "asc" as const } },
  voiceChannel: true,
};

function toMember(u: User) {
  return { id: u.id, username: u.username, displayName: u.displayName };
}

export function serializeLobby(
  lobby: LobbyWithRelations,
  currentUserId?: string | null
): LobbyJson {
  const guildId = process.env.DISCORD_GUILD_ID;
  const expired = lobby.expiresAt < new Date();
  const status =
    lobby.status === "closed" || expired
      ? "closed"
      : (lobby.status as "open" | "live" | "full");

  return {
    id: lobby.id,
    status,
    game: {
      slug: lobby.game.slug,
      name: lobby.game.name,
      emoji: lobby.game.emoji,
      colorA: lobby.game.colorA,
      colorB: lobby.game.colorB,
      coverUrl: lobby.game.coverUrl,
    },
    mode: lobby.mode,
    platform: lobby.platform,
    region: lobby.region,
    skillLevel: lobby.skillLevel,
    micRequired: lobby.micRequired,
    size: lobby.size,
    minSize: lobby.minSize,
    note: lobby.note,
    host: toMember(lobby.host),
    members: lobby.members.map((m) => toMember(m.user)),
    voice:
      (status === "full" || status === "live") && lobby.voiceChannel
        ? {
            channelName: lobby.voiceChannel.name,
            url: guildId
              ? `https://discord.com/channels/${guildId}/${lobby.voiceChannel.id}`
              : null,
            // discord:// protocol link opens the desktop app directly
            appUrl: guildId
              ? `discord://-/channels/${guildId}/${lobby.voiceChannel.id}`
              : null,
          }
        : null,
    inviteUrl: process.env.DISCORD_INVITE_URL || null,
    isMember: !!currentUserId && lobby.members.some((m) => m.userId === currentUserId),
    isHost: !!currentUserId && lobby.hostId === currentUserId,
    createdAt: lobby.createdAt.toISOString(),
    expiresAt: lobby.expiresAt.toISOString(),
  };
}
