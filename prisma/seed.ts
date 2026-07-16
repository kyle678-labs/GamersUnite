import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { loadEnv } from "../lib/env";

loadEnv();
process.env.DATABASE_URL ??= "file:./dev.db";

const prisma = new PrismaClient();

type SeedGame = {
  name: string;
  slug: string;
  emoji: string;
  colorA: string;
  colorB: string;
  blurb: string;
  maxPlayers: number;
  whyLfg: string;
  modes: string[];
};

// Curated catalog of multiplayer games players want to squad up for — from
// big matchmade shooters and MOBAs to invite-only co-op survival. GamersUnite
// is where you find the crew, fill the lobby, and hop into voice.
const GAMES: SeedGame[] = [
  { name: "Valorant", slug: "valorant", emoji: "🎯", colorA: "#ffd9df", colorB: "#d9e4ff", blurb: "Tactical 5v5 hero shooter. A full stack beats five randoms every single time.", maxPlayers: 5, whyLfg: "Stack for ranked", modes: ["Competitive", "Unrated", "Swiftplay", "Spike Rush", "Deathmatch"] },
  { name: "League of Legends", slug: "league-of-legends", emoji: "🧙", colorA: "#d9e8ff", colorB: "#e6dcff", blurb: "The 5v5 MOBA. Premade teams climb faster — and flame a whole lot less.", maxPlayers: 5, whyLfg: "Find a 5-stack", modes: ["Ranked", "Normal Draft", "ARAM", "Clash"] },
  { name: "Minecraft", slug: "minecraft", emoji: "🧱", colorA: "#e2f7d3", colorB: "#d3e8f7", blurb: "You know Minecraft. Find people for your next server, SMP or modpack.", maxPlayers: 20, whyLfg: "Self-hosted servers", modes: ["Survival", "Creative", "Hardcore", "Modded", "Minigames"] },
  { name: "Counter-Strike 2", slug: "counter-strike-2", emoji: "🔫", colorA: "#ffe8cc", colorB: "#d9e0ff", blurb: "The definitive tactical FPS. Queue as a five and actually use your mic.", maxPlayers: 5, whyLfg: "Stack for Premier", modes: ["Premier", "Competitive", "Wingman", "Deathmatch", "Faceit"] },
  { name: "Fortnite", slug: "fortnite", emoji: "🪂", colorA: "#e0e0ff", colorB: "#d6f0ff", blurb: "Build, battle and dance. Squads of four chase the Victory Royale.", maxPlayers: 4, whyLfg: "Fill your squad", modes: ["Battle Royale", "Zero Build", "Ranked", "Reload", "Creative"] },
  { name: "GTA V", slug: "gta-v", emoji: "🚗", colorA: "#d9f2e6", colorB: "#ffe6cc", blurb: "Los Santos is better with a crew. Pull heists, cause chaos, or just cruise.", maxPlayers: 30, whyLfg: "Crew up for heists", modes: ["Online Freemode", "Heists", "Races", "Roleplay (FiveM)"] },
  { name: "Overwatch", slug: "overwatch", emoji: "🦸", colorA: "#ffe0cc", colorB: "#cce6ff", blurb: "5v5 hero shooter. A coordinated team of five hard-counters solo queue.", maxPlayers: 5, whyLfg: "Group for comp", modes: ["Competitive", "Quick Play", "Stadium", "Arcade"] },
  { name: "Dota 2", slug: "dota-2", emoji: "🛡️", colorA: "#ffd9d9", colorB: "#d9dcff", blurb: "The deepest MOBA there is. A full party makes the climb bearable.", maxPlayers: 5, whyLfg: "Party up for ranked", modes: ["Ranked All Pick", "Turbo", "Unranked", "Ability Draft"] },
  { name: "Rocket League", slug: "rocket-league", emoji: "🚙", colorA: "#d9e8ff", colorB: "#ffe0f0", blurb: "Soccer, but with rocket-powered cars. Ranked doubles and threes need a partner.", maxPlayers: 4, whyLfg: "Find a 2s/3s partner", modes: ["Ranked 2s", "Ranked 3s", "Casual", "Tournaments", "Rumble"] },
  { name: "Call of Duty: MWIII", slug: "call-of-duty-mwiii", emoji: "🎖️", colorA: "#e0e6d6", colorB: "#d6dde8", blurb: "Fast-paced military FPS. Roll into multiplayer or Zombies with a full team.", maxPlayers: 6, whyLfg: "Fill a 6-man", modes: ["Multiplayer", "Ranked Play", "Zombies", "Warzone"] },
  { name: "PUBG", slug: "pubg", emoji: "🪖", colorA: "#e8dfcc", colorB: "#d6e0ff", blurb: "The original battle royale. Drop as a squad and play the circle smart.", maxPlayers: 4, whyLfg: "Fill your squad", modes: ["Squads", "Duos", "Ranked", "TDM"] },
  { name: "Apex Legends", slug: "apex-legends", emoji: "🎇", colorA: "#ffd9d9", colorB: "#ffe6cc", blurb: "Hero battle royale built around three-player squads and slick movement.", maxPlayers: 3, whyLfg: "Find your third", modes: ["Trios", "Ranked", "Duos", "Mixtape"] },
  { name: "Genshin Impact", slug: "genshin-impact", emoji: "🌟", colorA: "#d9f0ff", colorB: "#fff0d6", blurb: "Open-world action RPG. Team up for domains, weekly bosses and event co-op.", maxPlayers: 4, whyLfg: "Co-op domains & bosses", modes: ["Co-op Domains", "Bosses", "Spiral Abyss", "Exploration"] },
  { name: "Elden Ring", slug: "elden-ring", emoji: "🌒", colorA: "#e8e0cc", colorB: "#d9d6e8", blurb: "FromSoftware's masterpiece. Summon friends to co-op the toughest bosses.", maxPlayers: 4, whyLfg: "Summon a co-op crew", modes: ["Co-op Summons", "Nightreign", "PvP Invasions", "Boss Rush"] },
  { name: "Rainbow Six Siege", slug: "rainbow-six-siege", emoji: "💥", colorA: "#ffe0cc", colorB: "#d6e0f0", blurb: "Tactical 5v5 destruction and defense. Comms win rounds; randoms don't.", maxPlayers: 5, whyLfg: "Stack for ranked", modes: ["Ranked", "Standard", "Siege Cup", "Deathmatch"] },
  { name: "Once Human", slug: "once-human", emoji: "☢️", colorA: "#e0f0d6", colorB: "#e6d9ff", blurb: "Open-world survival in a strange, deviant-infested apocalypse. Better in a warband.", maxPlayers: 4, whyLfg: "Form a warband", modes: ["Co-op Survival", "PvE Server", "PvP Scenario", "Bosses"] },
  { name: "Chained Together", slug: "chained-together", emoji: "⛓️", colorA: "#ffe0e0", colorB: "#d6d6e8", blurb: "Climb out of hell literally chained to your friends. Chaos absolutely guaranteed.", maxPlayers: 4, whyLfg: "Needs a chained crew", modes: ["Co-op Climb", "Speedrun"] },
  { name: "Lethal Company", slug: "lethal-company", emoji: "🛰️", colorA: "#ffe3ec", colorB: "#e0d4ff", blurb: "Scavenge haunted moons for scrap with your crew — and try to make quota alive.", maxPlayers: 4, whyLfg: "Invite-only lobbies", modes: ["Co-op", "High Quota Challenge", "Modded"] },
  { name: "Phasmophobia", slug: "phasmophobia", emoji: "👻", colorA: "#e0e7ff", colorB: "#d8f3ff", blurb: "Hunt ghosts with friends using questionable equipment and even more questionable courage.", maxPlayers: 4, whyLfg: "Room codes only", modes: ["Co-op Investigation", "Weekly Challenge", "No Evidence"] },
  { name: "War Thunder", slug: "war-thunder", emoji: "✈️", colorA: "#d6e0e8", colorB: "#e8ddcc", blurb: "Planes, tanks and ships across the eras. Squad up to actually coordinate.", maxPlayers: 4, whyLfg: "Form a squad", modes: ["Realistic Battles", "Arcade", "Squadron Battles", "Simulator"] },
  { name: "Baldur's Gate III", slug: "baldurs-gate-iii", emoji: "🎲", colorA: "#e6d9cc", colorB: "#d9d6f0", blurb: "The definitive co-op CRPG. Four-player parties, endless choices, endless mischief.", maxPlayers: 4, whyLfg: "Find a co-op party", modes: ["Story Co-op", "Honour Mode", "Custom Campaign"] },
  { name: "Rust", slug: "rust", emoji: "🔩", colorA: "#e8ddcc", colorB: "#d6dde0", blurb: "Brutal survival where other players are the real threat. Roll with a group.", maxPlayers: 8, whyLfg: "Build a base group", modes: ["Vanilla Server", "Modded", "PvE", "Solo/Duo/Trio"] },
  { name: "World of Warcraft", slug: "world-of-warcraft", emoji: "🐉", colorA: "#e8dccc", colorB: "#d6e0f0", blurb: "The MMO. Find a group for Mythic+, raids and rated PvP.", maxPlayers: 20, whyLfg: "Group for M+ & raids", modes: ["Mythic+", "Raids", "PvP Arenas", "Questing"] },
  { name: "HELLDIVERS 2", slug: "helldivers-2", emoji: "🪐", colorA: "#d9e0f0", colorB: "#ffe6cc", blurb: "Spread managed democracy in four-player co-op. Friendly fire very much on.", maxPlayers: 4, whyLfg: "Fill a dive squad", modes: ["Co-op Missions", "Helldive Difficulty", "Blitz"] },
  { name: "Dead by Daylight", slug: "dead-by-daylight", emoji: "🔪", colorA: "#e0d6e8", colorB: "#e8dcd6", blurb: "Asymmetric 4v1 horror. Survive with friends (SWF) or hunt them down.", maxPlayers: 5, whyLfg: "Form a survivor squad", modes: ["Survivors", "Killer", "SWF"] },
  { name: "Stardew Valley", slug: "stardew-valley", emoji: "🌾", colorA: "#e8ffd6", colorB: "#ffe3ec", blurb: "The comfiest farm sim. Multiplayer farms are twice the comfy, half the chores.", maxPlayers: 8, whyLfg: "Invite-only farms", modes: ["Farm Co-op", "Fresh Farm", "Modded Expanded"] },
  { name: "Fall Guys", slug: "fall-guys", emoji: "👑", colorA: "#ffe0f0", colorB: "#d6f0ff", blurb: "Chaotic bean battle-royale obstacle courses. Squads share the crown chase.", maxPlayers: 4, whyLfg: "Squad up for shows", modes: ["Squads", "Solo Shows", "Duos", "Creative"] },
  { name: "Terraria", slug: "terraria", emoji: "🌳", colorA: "#dcffd6", colorB: "#d6ecff", blurb: "Dig, fight, explore, build — the 2D sandbox classic with endless co-op chaos.", maxPlayers: 8, whyLfg: "Self-hosted servers", modes: ["Co-op", "Master Mode", "Journey", "PvP", "Modded (Calamity)"] },
  { name: "Bloons TD 6", slug: "bloons-td-6", emoji: "🎈", colorA: "#d6f0ff", colorB: "#ffe0e0", blurb: "Pop bloons with monkeys and towers. Co-op maps split the defense four ways.", maxPlayers: 4, whyLfg: "Co-op maps & bosses", modes: ["Co-op", "Boss Events", "Race", "Sandbox"] },
  { name: "Don't Starve Together", slug: "dont-starve-together", emoji: "🔥", colorA: "#ffe8cc", colorB: "#e8d6ff", blurb: "Gothic wilderness survival where everything wants you dead, especially winter.", maxPlayers: 6, whyLfg: "Server browser is a gamble", modes: ["Survival", "Wilderness", "Endless"] },
  { name: "Barotrauma", slug: "barotrauma", emoji: "🦑", colorA: "#d6ecff", colorB: "#d9fff5", blurb: "Crew a submarine beneath the ice of Europa. Everything leaks, including the crew's sanity.", maxPlayers: 16, whyLfg: "Lobby browser is tiny", modes: ["Campaign Co-op", "Mission Mode", "PvP", "Traitor Mode"] },
  { name: "Core Keeper", slug: "core-keeper", emoji: "⛏️", colorA: "#e8ddff", colorB: "#d6fff0", blurb: "Cozy mining-sandbox with bosses, farming and base building under the surface.", maxPlayers: 8, whyLfg: "Invite-only lobbies", modes: ["Co-op", "Hardcore", "Boss Rush"] },
  { name: "Deep Rock Galactic", slug: "deep-rock-galactic", emoji: "🍺", colorA: "#ffeccc", colorB: "#e3d9ff", blurb: "Dwarves. Mining. Bugs. Rock and Stone! Find a squad for high hazards and deep dives.", maxPlayers: 4, whyLfg: "Haz 5 needs a real team", modes: ["Hazard 4–5", "Deep Dives", "Chill Mining"] },
  { name: "GTFO", slug: "gtfo", emoji: "🔦", colorA: "#e0e0f8", colorB: "#f8e0ee", blurb: "Brutal 4-player horror shooter. Stealth, coordination, and a lot of dying together.", maxPlayers: 4, whyLfg: "Needs a coordinated squad", modes: ["Rundown Co-op", "Checkpoint Runs"] },
  { name: "Enshrouded", slug: "enshrouded", emoji: "🌫️", colorA: "#e3e0ff", colorB: "#d9fff2", blurb: "Survival action RPG in a voxel world swallowed by fog. Build, delve, co-op.", maxPlayers: 16, whyLfg: "Self-hosted servers", modes: ["Survival Co-op", "Building Focus"] },
  { name: "Golf With Your Friends", slug: "golf-with-your-friends", emoji: "⛳", colorA: "#dcffe0", colorB: "#d6f0ff", blurb: "Mini golf with power-ups, custom maps and up to 12 players' worth of trash talk.", maxPlayers: 12, whyLfg: "Private lobbies", modes: ["Classic", "Dunk", "Hoops", "Party Modes"] },
  { name: "Grounded", slug: "grounded", emoji: "🐜", colorA: "#e6ffd6", colorB: "#fff0d6", blurb: "Honey I Shrunk the Kids meets survival crafting. The spiders are very large.", maxPlayers: 4, whyLfg: "Invite-only lobbies", modes: ["Co-op", "Whoa! Difficulty", "Playgrounds"] },
  { name: "It Takes Two", slug: "it-takes-two", emoji: "💞", colorA: "#ffd6e0", colorB: "#d6e5ff", blurb: "Co-op-only adventure built for exactly two players. Friend Pass means one copy is enough.", maxPlayers: 2, whyLfg: "Needs exactly one partner", modes: ["Story Co-op"] },
  { name: "Split Fiction", slug: "split-fiction", emoji: "📖", colorA: "#e0d9ff", colorB: "#d6f0ff", blurb: "From the makers of It Takes Two — a two-player co-op romp across sci-fi and fantasy.", maxPlayers: 2, whyLfg: "Needs exactly one partner", modes: ["Story Co-op"] },
  { name: "A Way Out", slug: "a-way-out", emoji: "🔓", colorA: "#e8ddcc", colorB: "#d6dde8", blurb: "A co-op-only prison break for exactly two. One copy covers both via Friend Pass.", maxPlayers: 2, whyLfg: "Needs exactly one partner", modes: ["Story Co-op"] },
  { name: "Left 4 Dead 2", slug: "left-4-dead-2", emoji: "🧟‍♂️", colorA: "#e0f0e0", colorB: "#f0e0e0", blurb: "The co-op zombie classic. Still alive, still best with a full team of four (or eight).", maxPlayers: 8, whyLfg: "Good lobbies are rare", modes: ["Campaign", "Versus", "Expert Realism", "Modded"] },
  { name: "Overcooked! 2", slug: "overcooked-2", emoji: "🍳", colorA: "#fff0cc", colorB: "#ffd9d9", blurb: "Cooperative kitchen chaos. Will end friendships. Will start better ones.", maxPlayers: 4, whyLfg: "Best with a full kitchen", modes: ["Campaign", "Arcade", "Versus"] },
  { name: "Palworld", slug: "palworld", emoji: "🥚", colorA: "#d6f6ff", colorB: "#ffedd6", blurb: "Catch pals, build factories, and question the ethics of both. Big co-op worlds.", maxPlayers: 32, whyLfg: "Self-hosted servers", modes: ["Co-op", "Dedicated Server", "Hardcore"] },
  { name: "Project Zomboid", slug: "project-zomboid", emoji: "🧟", colorA: "#e6f4d9", colorB: "#ffe8d6", blurb: "This is how you died. Hardcore zombie survival, better (and funnier) with friends.", maxPlayers: 16, whyLfg: "Self-hosted servers", modes: ["Survival Co-op", "PvP Server", "Roleplay"] },
  { name: "Raft", slug: "raft", emoji: "🏝️", colorA: "#d6f4ff", colorB: "#fff3d6", blurb: "Start on four planks in the middle of the ocean. End with a floating city. Watch for sharks.", maxPlayers: 8, whyLfg: "Invite-only lobbies", modes: ["Co-op", "Hard Mode", "Creative"] },
  { name: "Risk of Rain 2", slug: "risk-of-rain-2", emoji: "☔", colorA: "#d9e8ff", colorB: "#ffd9f2", blurb: "Roguelike shooter where the difficulty scales forever and so does the loot.", maxPlayers: 4, whyLfg: "Invite-only lobbies", modes: ["Monsoon", "Eclipse", "Modded 8-Player"] },
  { name: "Satisfactory", slug: "satisfactory", emoji: "🏭", colorA: "#ffe6d6", colorB: "#d6e8ff", blurb: "First-person factory building on an alien planet. The factory must grow.", maxPlayers: 4, whyLfg: "Invite-only sessions", modes: ["Factory Co-op", "Modded", "100% Efficiency"] },
  { name: "Sons of the Forest", slug: "sons-of-the-forest", emoji: "🌲", colorA: "#e0f2e9", colorB: "#f0ffd6", blurb: "Survive a cannibal-infested island. Kelvin will (probably) help.", maxPlayers: 8, whyLfg: "Invite-only lobbies", modes: ["Survival Co-op", "Hard Survival", "Peaceful Build"] },
  { name: "Valheim", slug: "valheim", emoji: "⚔️", colorA: "#d9f2e6", colorB: "#e5e0ff", blurb: "Viking survival across a huge procedurally generated purgatory. Build, sail, feast.", maxPlayers: 10, whyLfg: "Self-hosted servers", modes: ["Survival Co-op", "Hardcore", "Modded", "Fresh World"] },
];

// Real cover art (Steam CDN, verified hotlinkable). Games not listed here
// (not on Steam, e.g. Roblox/Valorant/LoL/Minecraft/Fortnite/Genshin/WoW)
// keep their emoji tile. Verified via scripts/check-covers.ts.
const STEAM_APP: Record<string, number> = {
  "counter-strike-2": 730,
  "gta-v": 271590,
  "overwatch": 2357570,
  "dota-2": 570,
  "rocket-league": 252950,
  "call-of-duty-mwiii": 2519060,
  "pubg": 578080,
  "apex-legends": 1172470,
  "elden-ring": 1245620,
  "rainbow-six-siege": 359550,
  "once-human": 2139460,
  "chained-together": 2567870,
  "lethal-company": 1966720,
  "phasmophobia": 739630,
  "war-thunder": 236390,
  "baldurs-gate-iii": 1086940,
  "rust": 252490,
  "helldivers-2": 553850,
  "dead-by-daylight": 381210,
  "stardew-valley": 413150,
  "fall-guys": 1097150,
  "terraria": 105600,
  "bloons-td-6": 960090,
  "dont-starve-together": 322330,
  "barotrauma": 602960,
  "core-keeper": 1621690,
  "deep-rock-galactic": 548430,
  "gtfo": 493520,
  "enshrouded": 1203620,
  "golf-with-your-friends": 431240,
  "grounded": 962130,
  "it-takes-two": 1426210,
  "split-fiction": 2001120,
  "a-way-out": 1222700,
  "left-4-dead-2": 550,
  "overcooked-2": 728880,
  "palworld": 1623730,
  "project-zomboid": 108600,
  "raft": 648800,
  "risk-of-rain-2": 632360,
  "satisfactory": 526870,
  "sons-of-the-forest": 1326470,
  "valheim": 892970,
};

// Manual covers: drop an image at public/covers/<slug>.<ext> and it wins over
// the Steam CDN art (and gives non-Steam games — Roblox, Valorant, etc. — a
// real cover). Landscape images look best (Steam headers are 460×215).
const COVER_DIR = path.join(process.cwd(), "public", "covers");
const COVER_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

function localCover(slug: string): string | null {
  for (const ext of COVER_EXTS) {
    const file = `${slug}${ext}`;
    if (fs.existsSync(path.join(COVER_DIR, file))) return `/covers/${file}`;
  }
  return null;
}

// Cover precedence: manual file in public/covers → Steam CDN art → emoji tile.
function coverFor(slug: string): string | null {
  const local = localCover(slug);
  if (local) return local;
  const appId = STEAM_APP[slug];
  return appId
    ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
    : null;
}

const DEMO_USERS = [
  { username: "PixelPenny", displayName: "Pixel Penny 🎀" },
  { username: "SofaSpud", displayName: "Sofa Spud" },
  { username: "NightOwl", displayName: "Night Owl 🦉" },
];

async function main() {
  console.log("🫧 Seeding GamersUnite...");

  // --- Games + modes ---
  for (const g of GAMES) {
    const { modes, ...rest } = g;
    const data = { ...rest, coverUrl: coverFor(g.slug) };
    const game = await prisma.game.upsert({
      where: { slug: g.slug },
      update: data,
      create: data,
    });
    // Drop any stale seed modes no longer in the list for this game.
    await prisma.gameMode.deleteMany({
      where: { gameId: game.id, source: "seed", name: { notIn: modes } },
    });
    for (const name of modes) {
      await prisma.gameMode.upsert({
        where: { gameId_name: { gameId: game.id, name } },
        update: { source: "seed" },
        create: { gameId: game.id, name, source: "seed" },
      });
    }
  }

  // Prune games that are no longer in the catalog (their lobbies/modes cascade).
  const slugs = GAMES.map((g) => g.slug);
  const pruned = await prisma.game.deleteMany({ where: { slug: { notIn: slugs } } });
  if (pruned.count > 0) console.log(`  ✂ removed ${pruned.count} games no longer in the catalog`);
  console.log(`  ✔ ${GAMES.length} games`);

  // --- Voice channels (fallback party rooms) ---
  // With a bot token configured, party channels are created on demand per
  // party, so the static pool (and its placeholders) isn't needed.
  const botMode = !!process.env.DISCORD_BOT_TOKEN;
  const raw = process.env.DISCORD_VOICE_CHANNELS?.trim();
  const channels = raw
    ? raw.split(",").map((pair) => {
        const [id, ...name] = pair.split(":");
        return { id: id.trim(), name: name.join(":").trim() || "Party Room" };
      })
    : botMode
      ? []
      : [1, 2, 3, 4].map((n) => ({
          id: `placeholder-${n}`,
          name: `Party Bubble ${n} 🫧`,
        }));
  if (botMode) {
    const removed = await prisma.voiceChannel.deleteMany({
      where: { id: { startsWith: "placeholder-" }, lobbyId: null },
    });
    if (removed.count > 0) console.log(`  ✂ removed ${removed.count} placeholder channels (bot mode)`);
  }
  for (const c of channels) {
    await prisma.voiceChannel.upsert({
      where: { id: c.id },
      update: { name: c.name },
      create: c,
    });
  }
  console.log(`  ✔ ${channels.length} pool voice channels${botMode ? " (bot creates party channels on demand)" : ""}`);

  // --- Demo users + demo lobbies (only on first run, never in production) ---
  const existing = await prisma.user.count();
  if (process.env.NODE_ENV === "production") {
    console.log("  ↷ production - skipping demo data");
  } else if (existing === 0) {
    const passwordHash = await bcrypt.hash("demo1234", 10);
    const users: { id: string }[] = [];
    for (const u of DEMO_USERS) {
      users.push(await prisma.user.create({ data: { ...u, passwordHash } }));
    }

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const demoLobbies: {
      game: string; host: number; members: number[]; size: number; minSize: number;
      mode: string; platform: string; region: string; skill: string;
      mic: boolean; note: string;
    }[] = [
      { game: "phasmophobia", host: 0, members: [0, 1, 2], size: 4, minSize: 4, mode: "Co-op Investigation", platform: "PC", region: "NA East", skill: "Any skill", mic: true, note: "One brave soul needed — we have snacks and a spirit box. 👻" },
      { game: "lethal-company", host: 1, members: [1], size: 4, minSize: 3, mode: "Co-op", platform: "PC", region: "Europe", skill: "New & chill", mic: true, note: "Quota's due, crew needed. Screaming optional but likely." },
      { game: "valheim", host: 2, members: [2, 0], size: 6, minSize: 3, mode: "Fresh World", platform: "PC", region: "NA West", skill: "Any skill", mic: false, note: "Starting a brand new world tonight — longboat crew assemble! ⚔️" },
      { game: "golf-with-your-friends", host: 1, members: [1, 2], size: 8, minSize: 3, mode: "Classic", platform: "Crossplay", region: "NA East", skill: "New & chill", mic: false, note: "Casual 18 holes, all skill levels, bring your worst putts." },
    ];

    for (const l of demoLobbies) {
      const game = await prisma.game.findUniqueOrThrow({ where: { slug: l.game } });
      await prisma.lobby.create({
        data: {
          gameId: game.id,
          hostId: users[l.host].id,
          mode: l.mode,
          platform: l.platform,
          region: l.region,
          skillLevel: l.skill,
          micRequired: l.mic,
          size: l.size,
          minSize: l.minSize,
          note: l.note,
          expiresAt,
          members: {
            create: l.members.map((i) => ({ userId: users[i].id })),
          },
        },
      });
    }
    console.log(`  ✔ ${users.length} demo users (password: demo1234) + ${demoLobbies.length} demo lobbies`);
  } else {
    console.log("  ↷ users already exist, skipping demo data");
  }

  console.log("✨ Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
