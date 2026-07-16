/**
 * Import multiplayer games from IGDB (the game database behind Twitch).
 *
 * IGDB gives us STRUCTURED multiplayer metadata, so games and their generic
 * modes resolve automatically — no manual data entry:
 *   - game_modes:        Co-op, Battle Royale, Split screen, MMO, ...
 *   - multiplayer_modes: online co-op, LAN co-op, split screen, max players
 *
 * Game-SPECIFIC modes (playlists like "Ranked" or community modes like
 * "High Quota") exist in no public database — those come from the community
 * mode system instead (hosts type them in, the site remembers them per game).
 *
 * Setup: create a Twitch app at https://dev.twitch.tv/console/apps and put
 * TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET in .env, then:
 *   npm run import:igdb -- "search term"     (or no args for top co-op games)
 */
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "../lib/env";

loadEnv();
process.env.DATABASE_URL ??= "file:./dev.db";

const prisma = new PrismaClient();

const GAME_MODE_NAMES: Record<number, string> = {
  1: "Single player",
  2: "Multiplayer",
  3: "Co-op",
  4: "Split screen",
  5: "MMO",
  6: "Battle Royale",
};

type IgdbGame = {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  cover?: { image_id: string };
  game_modes?: number[];
  multiplayer_modes?: {
    onlinecoop?: boolean;
    offlinecoop?: boolean;
    lancoop?: boolean;
    splitscreen?: boolean;
    onlinemax?: number;
    onlinecoopmax?: number;
  }[];
};

const PASTELS: [string, string][] = [
  ["#ffd6e8", "#d6e0ff"],
  ["#d6ecff", "#d9fff5"],
  ["#e8ddff", "#ffe8d6"],
  ["#dcffd6", "#d6ecff"],
  ["#fff0cc", "#ffd9d9"],
  ["#e0e7ff", "#ffe3ec"],
];
const EMOJI = ["🎮", "👾", "🕹️", "🎲", "🚀", "🗡️", "🏆", "🧩", "🐉", "🛡️"];

async function getTwitchToken(clientId: string, secret: string) {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${secret}&grant_type=client_credentials`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Twitch auth failed (${res.status}) — check your credentials.`);
  return (await res.json()).access_token as string;
}

async function main() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !secret) {
    console.error(
      "❌ Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env first.\n" +
        "   Create a (free) app at https://dev.twitch.tv/console/apps"
    );
    process.exit(1);
  }

  const search = process.argv.slice(2).join(" ").trim();
  const token = await getTwitchToken(clientId, secret);

  // Only multiplayer-capable games (co-op, multiplayer, battle royale, split screen).
  const query = search
    ? `search "${search.replace(/"/g, "")}"; where game_modes = (2,3,4,6); limit 25;`
    : `where game_modes = (2,3,4,6) & total_rating_count > 100; sort total_rating desc; limit 50;`;

  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    },
    body: `fields name, slug, summary, cover.image_id, game_modes, multiplayer_modes.*; ${query}`,
  });
  if (!res.ok) throw new Error(`IGDB request failed (${res.status}): ${await res.text()}`);
  const games: IgdbGame[] = await res.json();
  console.log(`🫧 IGDB returned ${games.length} games`);

  let imported = 0;
  for (const g of games) {
    const mp = g.multiplayer_modes?.[0];
    const maxPlayers = Math.max(mp?.onlinemax ?? 0, mp?.onlinecoopmax ?? 0) || 4;

    // Structured modes, resolved automatically from IGDB metadata.
    const modes = new Set<string>();
    for (const id of g.game_modes ?? []) {
      if (id !== 1 && GAME_MODE_NAMES[id]) modes.add(GAME_MODE_NAMES[id]);
    }
    if (mp?.onlinecoop) modes.add("Online co-op");
    if (mp?.lancoop) modes.add("LAN co-op");
    if (mp?.splitscreen || mp?.offlinecoop) modes.add("Couch co-op");

    const h = [...g.slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
    const [colorA, colorB] = PASTELS[h % PASTELS.length];

    const game = await prisma.game.upsert({
      where: { slug: g.slug },
      update: {
        name: g.name,
        blurb: g.summary?.slice(0, 180) ?? null,
        coverUrl: g.cover
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
          : null,
        maxPlayers,
        source: "igdb",
        sourceId: String(g.id),
      },
      create: {
        slug: g.slug,
        name: g.name,
        blurb: g.summary?.slice(0, 180) ?? null,
        emoji: EMOJI[h % EMOJI.length],
        colorA,
        colorB,
        coverUrl: g.cover
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
          : null,
        maxPlayers,
        source: "igdb",
        sourceId: String(g.id),
      },
    });

    for (const name of modes) {
      await prisma.gameMode.upsert({
        where: { gameId_name: { gameId: game.id, name } },
        update: {},
        create: { gameId: game.id, name, source: "igdb" },
      });
    }
    imported++;
    console.log(`  ✔ ${g.name} (${[...modes].join(", ") || "multiplayer"})`);
  }

  console.log(`✨ Imported/updated ${imported} games.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
