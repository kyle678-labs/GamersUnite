import { prisma } from "./db";
import { VOICE_TTL_HOURS } from "./constants";
import {
  allowMemberInChannel,
  botConfigured,
  createPartyTextChannel,
  createPartyVoiceChannel,
  deletePartyVoiceChannel,
  getChannelAllowedMembers,
  sendDirectMessage,
} from "./discord";

// VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY — what a member is
// allowed in the party text channel (mirrors TEXT_MEMBER_ALLOW in discord.ts).
const TEXT_MEMBER_ALLOW = (1024n | 2048n | 65536n).toString();

// Assign a voice channel to a freshly-filled lobby.
// Preferred path: the bot creates a dedicated channel per party — named after
// the game, capped at the party size, and locked so only the party's Discord
// accounts can connect. Fallback (no bot configured, or the Discord API call
// fails): grab a free channel from the static pool.
export async function assignVoiceChannel(lobbyId: string) {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: { game: true, host: true, members: { include: { user: true } } },
  });
  if (!lobby) return null;
  const allowIds = lobby.members
    .map((m) => m.user.discordId)
    .filter((id): id is string => !!id);

  // Reuse: a party that filled, lost someone, and refilled with the SAME
  // people keeps its channel. If the roster changed, the channel is replaced
  // (editing overwrites would need MANAGE_ROLES, which the bot doesn't have).
  const existing = await prisma.voiceChannel.findUnique({ where: { lobbyId } });
  if (existing) {
    if (!existing.managed || !botConfigured()) return existing;
    const current = await getChannelAllowedMembers(existing.id);
    const sameRoster =
      current !== null &&
      [...current].sort().join() === [...allowIds].sort().join();
    if (sameRoster) return existing;
    await deletePartyVoiceChannel(existing.id);
    if (existing.textChannelId) await deletePartyVoiceChannel(existing.textChannelId);
    await prisma.voiceChannel.delete({ where: { id: existing.id } });
    // fall through to create a fresh channel for the new roster
  }

  if (botConfigured()) {
    try {
      const channel = await createPartyVoiceChannel(
        `${lobby.game.emoji} ${lobby.game.name} · ${lobby.host.displayName}`,
        lobby.size,
        allowIds
      );
      // Companion members-only text channel. Best-effort: a null result just
      // means the party has voice but no chat — never a reason to fail.
      const text = await createPartyTextChannel(
        `${lobby.game.name} party`,
        allowIds
      ).catch(() => null);
      return await prisma.voiceChannel.create({
        data: {
          id: channel.id,
          name: channel.name,
          lobbyId,
          managed: true,
          textChannelId: text?.id ?? null,
        },
      });
    } catch (e) {
      console.error("Bot channel creation failed, falling back to pool:", e);
    }
  }

  return assignFromPool(lobbyId);
}

// A pool channel is free if it has no lobby, or its lobby is closed/expired.
async function assignFromPool(lobbyId: string) {
  const now = new Date();
  const channels = await prisma.voiceChannel.findMany({
    where: { managed: false },
    include: { lobby: { select: { id: true, status: true, expiresAt: true } } },
    orderBy: { name: "asc" },
  });
  const free = channels.find(
    (c) => !c.lobby || c.lobby.status === "closed" || c.lobby.expiresAt < now
  );
  if (!free) return null;
  return prisma.voiceChannel.update({
    where: { id: free.id },
    data: { lobbyId },
  });
}

// Called when a party ends: bot-created channels are deleted from Discord,
// pool channels are just released back to the pool.
export async function releaseVoiceChannel(lobbyId: string) {
  const channel = await prisma.voiceChannel.findUnique({ where: { lobbyId } });
  if (!channel) return;
  if (channel.managed) {
    await deletePartyVoiceChannel(channel.id);
    if (channel.textChannelId) await deletePartyVoiceChannel(channel.textChannelId);
    await prisma.voiceChannel.delete({ where: { id: channel.id } });
  } else {
    await prisma.voiceChannel.update({
      where: { id: channel.id },
      data: { lobbyId: null },
    });
  }
}

// Reap bot-created channels whose party ended, expired, or simply has had its
// room longer than VOICE_TTL_HOURS — channels never live forever. Runs from
// the background sweeper and opportunistically on lobby mutations.
export async function cleanupExpiredChannels() {
  const now = new Date();
  const ttlCutoff = new Date(now.getTime() - VOICE_TTL_HOURS * 60 * 60 * 1000);
  const channels = await prisma.voiceChannel.findMany({
    where: { managed: true },
    include: { lobby: true },
  });
  for (const c of channels) {
    const lobbyDead =
      !c.lobby || c.lobby.status === "closed" || c.lobby.expiresAt < now;
    const ttlExpired = c.createdAt < ttlCutoff;
    if (!lobbyDead && !ttlExpired) continue;
    await deletePartyVoiceChannel(c.id);
    if (c.textChannelId) await deletePartyVoiceChannel(c.textChannelId);
    await prisma.voiceChannel.delete({ where: { id: c.id } });
    // A party whose room timed out is over — close it so it doesn't sit
    // "full" on the site with no voice channel.
    if (ttlExpired && c.lobby && c.lobby.status !== "closed") {
      await prisma.lobby.update({
        where: { id: c.lobby.id },
        data: { status: "closed" },
      });
    }
  }
}

// Called after a member joins. Parties have a size RANGE: voice opens the
// moment `minSize` players are in (status → "live"), and people keep joining
// a live party until it hits `size` (status → "full").
export async function handleLobbyJoin(lobbyId: string, joinedUserId: string) {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      game: true,
      members: { include: { user: true } },
      voiceChannel: true,
    },
  });
  if (!lobby || lobby.status === "closed") return;
  const count = lobby.members.length;
  const nextStatus = count >= lobby.size ? "full" : count >= lobby.minSize ? "live" : "open";

  if (!lobby.voiceChannel) {
    if (count < lobby.minSize) return; // still recruiting
    await prisma.lobby.update({ where: { id: lobbyId }, data: { status: nextStatus } });
    const channel = await assignVoiceChannel(lobbyId);
    if (channel) void notifyPartyLive(lobbyId, channel.id, channel.name);
    return;
  }

  // Party is already live — whitelist the newcomer into the existing channel.
  await prisma.lobby.update({ where: { id: lobbyId }, data: { status: nextStatus } });
  const joiner = lobby.members.find((m) => m.userId === joinedUserId);
  if (lobby.voiceChannel.managed && botConfigured() && joiner?.user.discordId) {
    try {
      await allowMemberInChannel(lobby.voiceChannel.id, joiner.user.discordId);
      // Also let them into the party text channel (best-effort — a text-only
      // hiccup isn't worth tearing down a working voice channel).
      if (lobby.voiceChannel.textChannelId) {
        try {
          await allowMemberInChannel(
            lobby.voiceChannel.textChannelId,
            joiner.user.discordId,
            TEXT_MEMBER_ALLOW
          );
        } catch (e) {
          console.error("Couldn't add member to party text channel:", e);
        }
      }
    } catch (e) {
      // No MANAGE_ROLES → can't edit overwrites; replace the channel instead.
      console.error("Couldn't add member overwrite, replacing channel:", e);
      await releaseVoiceChannel(lobbyId);
      await assignVoiceChannel(lobbyId);
    }
    const channel = await prisma.voiceChannel.findUnique({ where: { lobbyId } });
    if (channel) {
      void notifyLateJoiner(joiner.user.discordId, lobby.game.name, channel.id, channel.name);
    }
  }
}

// Fire-and-forget DMs so join requests stay snappy.
async function notifyPartyLive(lobbyId: string, channelId: string, channelName: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId || !botConfigured()) return;
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: { game: true, voiceChannel: true, members: { include: { user: true } } },
  });
  if (!lobby) return;
  const url = `https://discord.com/channels/${guildId}/${channelId}`;
  const textId = lobby.voiceChannel?.textChannelId;
  const textLine = textId
    ? `💬 Party chat: https://discord.com/channels/${guildId}/${textId}\n`
    : "";
  const spots = lobby.size - lobby.members.length;
  const content =
    `🎉 **Party time!** Your **${lobby.game.name}** party on GamersUnite is ready to go.\n` +
    `🔊 Hop into **${channelName}** → ${url}\n` +
    textLine +
    (spots > 0 ? `${spots} more can still join. GLHF! 🫧` : `GLHF! 🫧`);
  await Promise.allSettled(
    lobby.members
      .map((m) => m.user.discordId)
      .filter((id): id is string => !!id)
      .map((id) => sendDirectMessage(id, content))
  );
}

async function notifyLateJoiner(
  discordId: string,
  gameName: string,
  channelId: string,
  channelName: string
) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return;
  const url = `https://discord.com/channels/${guildId}/${channelId}`;
  await sendDirectMessage(
    discordId,
    `🎮 You're in! The **${gameName}** party is already in voice.\n🔊 Hop into **${channelName}** → ${url}`
  );
}

export function lobbyIsActive(lobby: { status: string; expiresAt: Date }) {
  return lobby.status !== "closed" && lobby.expiresAt > new Date();
}

// Where-clause fragment for lobbies still worth showing.
export function activeLobbyWhere() {
  return { status: { not: "closed" }, expiresAt: { gt: new Date() } };
}
