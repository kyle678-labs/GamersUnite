# GamersUnite 🫧

Matchmaking for games that don't have it. Players pick a game, set parameters
(mode, platform, region, party size, mic, skill vibe), and join or create a
**party**. The moment a party fills up, everyone is pointed at the same **Discord
voice channel**.

Built with Next.js 15 (App Router), Tailwind CSS 4, Prisma + SQLite.

## Quick start

```bash
npm install
npm run db:push    # create the SQLite database
npm run db:seed    # seed games, demo users, demo parties, voice channels
npm run dev        # http://localhost:3000
```

Accounts are **Discord-only** — "Continue with Discord" is the single sign-in
path (it's how party voice rooms get locked to their members). The seed's demo
users (`PixelPenny` etc.) exist as data for demo parties but can't log in.

## How matchmaking works

1. A host **starts a party** for a game with parameters: game mode, platform,
   region, skill vibe, mic required, and a **player range** — the count where
   voice opens (min) and the party cap (max). Minecraft can start at 2 and
   grow to 8; a 4-player co-op can demand all 4 before anything happens.
2. Other players browse/filter parties (or a game's page) and **join** — but
   only if their Discord account is a member of the server (the bot checks;
   non-members get the invite link instead).
3. When the member count reaches the **minimum**, the party goes **live**: the
   bot creates a dedicated voice channel — capped at the party max and
   **locked so only the party members' Discord accounts can connect**
   (`@everyone` is denied CONNECT; each member is allowed; the bot self-allows
   so it can manage the channel). Everyone sees the voice card with an
   **Open in Discord app** deep link (`discord://`) and a browser link, and
   the bot **DMs every member**. Players keep joining a live party until it's
   **full** — each late joiner is whitelisted into the existing channel (needs
   the bot's Manage Roles permission; without it the channel is replaced) and
   DM'd the link. Without a bot token, a static channel pool is used instead.
4. Parties expire after 4 hours and voice channels are reaped
   `VOICE_TTL_HOURS` (default 3) after creation — a background sweeper
   (`instrumentation.ts` → `lib/sweeper.ts`, every 10 min) guarantees channels
   never linger, closing the party when its room times out. If a reopened
   party refills with a different roster, the channel is **replaced** (editing
   overwrites would need MANAGE_ROLES, which the bot deliberately doesn't
   have). Hosts can also end a party manually.

The UI supports **light and dark mode** — it follows the system preference and
has a 🌙 toggle in the navbar (persisted in localStorage).

## Community safety: blocking & reporting

Your profile lists **recent teammates** (everyone you've shared a party with,
most recent first). From there — or from any live party's roster — you can
**block** or **report** a player.

- **Blocking is mutual invisibility.** If A blocks B, neither sees the other's
  parties anywhere (home, browse, game pages, direct links → 404), B is dropped
  from A's recent-teammates list into a **Blocked accounts** manager (unblock
  anytime), and neither can join a party containing the other. Enforced
  symmetrically in `lib/social.ts` (`getBlockSet` unions both directions;
  `hideBlockedLobbies` filters listings; `isLobbyHiddenFrom` guards direct
  access) — your own parties are never hidden from you.
- **Reports** capture a reason (toxic, cheating, scam, inappropriate name,
  other) plus optional detail and land in the `Report` table as `open` for
  moderator review. Reporting is private and doesn't notify the reported user.

## Connecting your Discord server

Everything Discord lives in `.env`:

| Variable | What it does |
| --- | --- |
| `DISCORD_INVITE_URL` | Public invite link shown across the site and to matched players. |
| `DISCORD_GUILD_ID` | Your server ID (right-click server with Developer Mode on). Enables deep links straight into voice channels. |
| `DISCORD_BOT_TOKEN` | **Bot mode (recommended):** the bot creates a dedicated voice channel per live party — named after the game, capped at party size, under a "🫧 Party Rooms" category — and deletes it when the party ends. Create a bot at <https://discord.com/developers/applications> (Bot tab → Reset Token) and invite it with **Manage Channels + Manage Roles + Create Invite**: `https://discord.com/oauth2/authorize?client_id=<APP_ID>&scope=bot&permissions=268435473`. |
| `DISCORD_PARTY_CATEGORY_ID` | Optional: existing category to create party channels under. Auto-created if empty. |
| `DISCORD_VOICE_CHANNELS` | Fallback static pool (used when no bot token is set): `channelId:Name,channelId:Name`. Re-run `npm run db:seed` after changing. |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | **Required** — accounts are Discord-only. Same app as the bot works; add redirect `http://localhost:3000/api/auth/discord/callback` (plus your production URL when you deploy). |
| `MODERATOR_DISCORD_IDS` | Comma-separated Discord user IDs who always have moderator powers (the owner bootstrap). Additional mods can be flagged in the DB via `User.isModerator`. |

Without configuration the app still works: it uses placeholder party rooms and
password accounts, so you can try the whole flow locally first.

## Where the games come from

Two sources, by design:

Cover art comes from the Steam CDN (hotlink-friendly, no API key); games not on
Steam (e.g. Minecraft) fall back to their emoji tile.

**1. Curated seed (default).** `prisma/seed.ts` ships ~24 multiplayer games that
specifically *lack* public matchmaking — invite-only lobbies (Lethal Company,
Raft), room codes (Phasmophobia, Jackbox), or self-hosted servers (Valheim,
Minecraft, Project Zomboid). No public database has a "has no matchmaking" flag,
so a curated list is the honest way to bootstrap exactly these games.

**2. IGDB import (optional, automated).** `npm run import:igdb` pulls games from
IGDB with **structured multiplayer metadata** — `game_modes` (Co-op, Battle
Royale, Split screen…) and `multiplayer_modes` (online/LAN/couch co-op, max
player counts) — so generic modes and player counts resolve with **no manual
work**. Needs free Twitch credentials in `.env` (IGDB is operated by Twitch).

```bash
npm run import:igdb                    # top-rated multiplayer games
npm run import:igdb -- "stardew"       # search for specific games
```

### How game-specific modes are resolved (the "no manual intervention" answer)

Generic modes come from IGDB automatically. But game-*specific* modes ("High
Quota", "Eclipse 8", "Expert Realism") exist in **no** public database — nothing
can resolve those automatically. Instead of manual curation, the site uses
**community-sourced modes**: when a host creates a party, they either pick a
suggested mode or type a new one. New modes are saved per game and suggested to
every future host (marked 🌱 on the game page). The mode catalog grows itself
from real usage — zero admin work.

## Community safety

Players can **block** anyone they've partied with (mutual invisibility: neither
sees the other's parties, even by direct link) and **report** them with a
reason + details. Moderators get a **console at `/moderator`** (🛡️ in the
navbar): reports arrive grouped by reported player, most-reported first, with
open/all filters. Per report: *mark reviewed*. Per player: **ban** — which
logs them out everywhere, blocks future logins (they land on `/banned`),
closes their hosted parties, pulls them from joined ones, revokes their voice
access, and auto-resolves their open reports as "actioned" — and **unban**.
Moderators are the env allowlist plus anyone with `User.isModerator`.

## Project tour

```
app/                  pages + API routes (App Router)
  api/auth/…          signup, login, logout, Discord OAuth
  api/lobbies/…       create / get / join / leave / close parties
  games/, lobbies/    catalog, party browser, live party page
components/           UI (LobbyLive polls the party every 4s)
lib/matchmaking.ts    party-full logic + voice channel pool
prisma/schema.prisma  User, Session, Game, GameMode, Lobby, VoiceChannel
prisma/seed.ts        curated game catalog + demo data
scripts/import-igdb.ts  automated game import from IGDB
```

## Ideas for later

- Bot pings matched players by Discord mention when their party fills.
- Notifications (web push) when your party fills while you browse other tabs.
- Scheduled parties ("tonight 8pm EST") with calendar reminders.
