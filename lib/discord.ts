// Discord bot integration via plain REST — no gateway/websocket process needed.
// The bot creates a dedicated voice channel per filled party (under a
// "🫧 Party Rooms" category), locks it to the party's members, and deletes it
// when the party ends. Needs a bot token with MANAGE_CHANNELS on the guild.

const API = "https://discord.com/api/v10";
const PARTY_CATEGORY_NAME = "🫧 Party Rooms";
const MOD_LOG_CHANNEL_NAME = "mod-log";
const GAME_REQUEST_CHANNEL_NAME = "game-requests";
const CONNECT = "1048576"; // 1 << 20
const VIEW_CHANNEL = "1024"; // 1 << 10
// Text-channel member allowance: VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY.
const TEXT_MEMBER_ALLOW = (1024n | 2048n | 65536n).toString();
// VIEW_CHANNEL | MANAGE_CHANNELS | CONNECT — what the bot grants ITSELF on
// each party voice channel. Without this it locks itself out the moment it
// denies @everyone, and can no longer delete the channel. It must only
// self-grant permissions it already holds guild-wide, or Discord rejects it.
const BOT_SELF_ALLOW = (1024n | 16n | 1048576n).toString();
// Same idea for the party text channel: VIEW | MANAGE_CHANNELS | SEND | READ_HISTORY.
const BOT_TEXT_SELF_ALLOW = (1024n | 16n | 2048n | 65536n).toString();

export function botConfigured() {
  return !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);
}

// A bot token's first segment is the base64-encoded bot user id.
function botUserId(): string | null {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  try {
    const id = Buffer.from(token.split(".")[0], "base64").toString("utf8");
    return /^\d{15,21}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export class DiscordApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function discordFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "DiscordBot (https://localhost, 0.1.0) GamersUnite",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new DiscordApiError(
      res.status,
      `Discord API ${path} → ${res.status}: ${await res.text()}`
    );
  }
  return res.status === 204 ? null : res.json();
}

// Is this Discord account a member of our server? Party voice rooms live
// there, so joining a party requires being in the guild.
export async function isGuildMember(discordUserId: string): Promise<boolean> {
  if (!botConfigured()) return true;
  try {
    await discordFetch(
      `/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}`
    );
    return true;
  } catch (e) {
    if (e instanceof DiscordApiError && e.status === 404) return false;
    // Discord hiccup — don't lock people out of matchmaking over it.
    console.error("Guild membership check failed:", e);
    return true;
  }
}

// DM a user when their party fills. Fails quietly (users can disable DMs).
export async function sendDirectMessage(discordUserId: string, content: string) {
  try {
    const dm = await discordFetch(`/users/@me/channels`, {
      method: "POST",
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    await discordFetch(`/channels/${dm.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  } catch (e) {
    console.error("Match DM failed for", discordUserId, e);
  }
}

type DiscordChannel = { id: string; name: string; type: number };

// Lock the channel: @everyone can see it but can't connect; each party
// member's Discord account is explicitly allowed in; the bot keeps full
// access so it can still manage and delete the channel.
function voiceOverwrites(allowDiscordIds: string[]) {
  const bot = botUserId();
  return [
    { id: process.env.DISCORD_GUILD_ID!, type: 0, deny: CONNECT },
    ...(bot ? [{ id: bot, type: 1, allow: BOT_SELF_ALLOW }] : []),
    ...allowDiscordIds
      .filter((id) => id !== bot) // never duplicate/override the bot's own entry
      .map((id) => ({ id, type: 1, allow: CONNECT })),
  ];
}

// Party channels live under a category so they don't clutter the server.
// Uses DISCORD_PARTY_CATEGORY_ID if set, otherwise finds/creates by name.
async function findOrCreatePartyCategory(): Promise<string | undefined> {
  const configured = process.env.DISCORD_PARTY_CATEGORY_ID;
  if (configured) return configured;
  const guildId = process.env.DISCORD_GUILD_ID!;
  const channels: DiscordChannel[] = await discordFetch(`/guilds/${guildId}/channels`);
  const existing = channels.find((c) => c.type === 4 && c.name === PARTY_CATEGORY_NAME);
  if (existing) return existing.id;
  const created = await discordFetch(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: JSON.stringify({ name: PARTY_CATEGORY_NAME, type: 4 }),
  });
  return created.id;
}

export async function createPartyVoiceChannel(
  name: string,
  userLimit: number,
  allowDiscordIds: string[]
): Promise<{ id: string; name: string }> {
  const guildId = process.env.DISCORD_GUILD_ID!;
  const parentId = await findOrCreatePartyCategory().catch(() => undefined);
  const base = {
    name: name.slice(0, 100),
    type: 2, // voice
    user_limit: Math.min(Math.max(userLimit, 0), 99),
    ...(parentId ? { parent_id: parentId } : {}),
  };
  try {
    return await discordFetch(`/guilds/${guildId}/channels`, {
      method: "POST",
      body: JSON.stringify({ ...base, permission_overwrites: voiceOverwrites(allowDiscordIds) }),
    });
  } catch (e) {
    // A member overwrite can be rejected (e.g. account not in the guild yet).
    // Better a locked room missing one allowance than no room at all.
    console.error("Channel create with member overwrites failed, retrying locked-only:", e);
    return await discordFetch(`/guilds/${guildId}/channels`, {
      method: "POST",
      body: JSON.stringify({ ...base, permission_overwrites: voiceOverwrites([]) }),
    });
  }
}

// Lock a text channel: hidden from @everyone, visible + writable to each party
// member, and the bot keeps full access so it can manage/delete it.
function textOverwrites(allowDiscordIds: string[]) {
  const bot = botUserId();
  return [
    { id: process.env.DISCORD_GUILD_ID!, type: 0, deny: VIEW_CHANNEL },
    ...(bot ? [{ id: bot, type: 1, allow: BOT_TEXT_SELF_ALLOW }] : []),
    ...allowDiscordIds
      .filter((id) => id !== bot)
      .map((id) => ({ id, type: 1, allow: TEXT_MEMBER_ALLOW })),
  ];
}

// Create the party's members-only text channel (a companion to the voice
// channel). Same category, same roster. Returns null on failure — a party can
// live without its text channel, so this never blocks voice creation.
export async function createPartyTextChannel(
  name: string,
  allowDiscordIds: string[]
): Promise<{ id: string; name: string } | null> {
  const guildId = process.env.DISCORD_GUILD_ID!;
  const parentId = await findOrCreatePartyCategory().catch(() => undefined);
  const base = {
    name: name.slice(0, 100),
    type: 0, // text
    ...(parentId ? { parent_id: parentId } : {}),
  };
  try {
    return await discordFetch(`/guilds/${guildId}/channels`, {
      method: "POST",
      body: JSON.stringify({ ...base, permission_overwrites: textOverwrites(allowDiscordIds) }),
    });
  } catch (e) {
    console.error("Party text channel create failed:", e);
    return null;
  }
}

// Let one more account into a live party's channel (used when someone joins
// after the party started). Needs MANAGE_ROLES — throws if the bot doesn't
// have it, so the caller can fall back to replacing the channel. Works for
// both voice (allow = CONNECT) and text (allow = view/send) channels.
export async function allowMemberInChannel(
  channelId: string,
  discordUserId: string,
  allow: string = CONNECT
) {
  if (discordUserId === botUserId()) return; // never downgrade the bot's own entry
  await discordFetch(`/channels/${channelId}/permissions/${discordUserId}`, {
    method: "PUT",
    body: JSON.stringify({ type: 1, allow, deny: "0" }),
  });
}

// Revoke a leaver's access. Best-effort — the TTL reaper is the backstop.
export async function removeMemberFromChannel(channelId: string, discordUserId: string) {
  if (discordUserId === botUserId()) return; // never delete the bot's own access
  try {
    await discordFetch(`/channels/${channelId}/permissions/${discordUserId}`, {
      method: "DELETE",
    });
  } catch (e) {
    console.error("Failed to remove member overwrite", channelId, discordUserId, e);
  }
}

// Which member accounts are currently allowed to connect (excluding the bot).
// Editing overwrites needs MANAGE_ROLES (which the bot deliberately doesn't
// have), so roster changes are handled by replacing the channel instead —
// this getter lets the caller detect whether that's needed.
export async function getChannelAllowedMembers(channelId: string): Promise<string[] | null> {
  try {
    const ch = await discordFetch(`/channels/${channelId}`);
    const bot = botUserId();
    return (ch.permission_overwrites ?? [])
      .filter(
        (o: { id: string; type: number; allow: string }) =>
          o.type === 1 && o.id !== bot && (BigInt(o.allow) & 1048576n) !== 0n
      )
      .map((o: { id: string }) => o.id);
  } catch {
    return null;
  }
}

export async function deletePartyVoiceChannel(id: string) {
  try {
    await discordFetch(`/channels/${id}`, { method: "DELETE" });
  } catch (e) {
    // Channel may already be gone (deleted by hand in Discord) — not fatal.
    console.error("Failed to delete party voice channel", id, e);
  }
}

// Staff-facing log channels (mod-log, game-requests). Each is a text channel
// hidden from @everyone so only server staff (who bypass the overwrite) and
// the bot can read it. Resolved once per name and cached for the process life.
const hiddenChannelCache = new Map<string, string>();

async function findOrCreateHiddenChannel(
  name: string,
  topic: string,
  overrideId?: string
): Promise<string | undefined> {
  if (overrideId) return overrideId;
  const cached = hiddenChannelCache.get(name);
  if (cached) return cached;

  const guildId = process.env.DISCORD_GUILD_ID!;
  const channels: DiscordChannel[] = await discordFetch(`/guilds/${guildId}/channels`);
  const existing = channels.find((c) => c.type === 0 && c.name === name);
  if (existing) {
    hiddenChannelCache.set(name, existing.id);
    return existing.id;
  }

  const bot = botUserId();
  const created = await discordFetch(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: JSON.stringify({
      name,
      type: 0, // text
      topic,
      permission_overwrites: [
        // Hide from everyone; the bot keeps read/write so it can post here.
        { id: guildId, type: 0, deny: VIEW_CHANNEL },
        ...(bot ? [{ id: bot, type: 1, allow: VIEW_CHANNEL }] : []),
      ],
    }),
  });
  hiddenChannelCache.set(name, created.id);
  return created.id;
}

type ReportAlert = {
  reporterName: string;
  reportedName: string;
  reportedId: string;
  reasonLabel: string;
  details: string | null;
  lobbyId: string | null;
};

// Post a new report to the mod-log channel. Fire-and-forget: a Discord hiccup
// must never block a user from filing a report (the moderator console at
// /moderator is the source of truth regardless).
export async function postReportToModLog(report: ReportAlert) {
  if (!botConfigured()) return;
  try {
    const channelId = await findOrCreateHiddenChannel(
      MOD_LOG_CHANNEL_NAME,
      "Automated moderation alerts from GamersUnite",
      process.env.DISCORD_MOD_LOG_CHANNEL_ID
    );
    if (!channelId) return;

    const consoleUrl = process.env.APP_URL
      ? `${process.env.APP_URL.replace(/\/$/, "")}/moderator`
      : undefined;

    const fields = [
      { name: "Reported", value: `${report.reportedName} (\`${report.reportedId}\`)`, inline: true },
      { name: "By", value: report.reporterName, inline: true },
      { name: "Reason", value: report.reasonLabel, inline: true },
    ];
    if (report.details) fields.push({ name: "Details", value: report.details.slice(0, 1024), inline: false });
    if (report.lobbyId) fields.push({ name: "Party", value: `\`${report.lobbyId}\``, inline: false });

    await discordFetch(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        embeds: [
          {
            title: "🚩 New player report",
            color: 0xec4899, // pink to match the site
            fields,
            ...(consoleUrl ? { description: `[Open the moderator console](${consoleUrl})` } : {}),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (e) {
    console.error("Failed to post report to mod-log:", e);
  }
}

type GameRequest = {
  requesterName: string;
  gameName: string;
  note: string | null;
};

// Post a new-game request to the #game-requests channel. Fire-and-forget, same
// contract as the report alert: a Discord hiccup never fails the request.
export async function postGameRequestToChannel(request: GameRequest) {
  if (!botConfigured()) return;
  try {
    const channelId = await findOrCreateHiddenChannel(
      GAME_REQUEST_CHANNEL_NAME,
      "New-game requests from GamersUnite players",
      process.env.DISCORD_GAME_REQUEST_CHANNEL_ID
    );
    if (!channelId) return;

    const fields = [
      { name: "Game", value: request.gameName.slice(0, 256), inline: true },
      { name: "Requested by", value: request.requesterName, inline: true },
    ];
    if (request.note) fields.push({ name: "Note", value: request.note.slice(0, 1024), inline: false });

    await discordFetch(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        embeds: [
          {
            title: "🎮 New game request",
            color: 0x8b5cf6, // purple to match the site
            fields,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (e) {
    console.error("Failed to post game request:", e);
  }
}
