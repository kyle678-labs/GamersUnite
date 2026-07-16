import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { activeLobbyWhere } from "@/lib/matchmaking";
import { hideBlockedLobbies, getBlockSet } from "@/lib/social";
import { lobbyInclude } from "@/lib/serialize";
import GameCard from "@/components/GameCard";
import LobbyCard from "@/components/LobbyCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getUser();
  const blockSet = user ? await getBlockSet(user.id) : new Set<string>();
  const [games, lobbies, lobbyCounts] = await Promise.all([
    prisma.game.findMany({ include: { modes: true }, take: 6, orderBy: { name: "asc" } }),
    prisma.lobby.findMany({
      where: {
        ...activeLobbyWhere(),
        status: "open",
        ...(user ? hideBlockedLobbies([...blockSet], user.id) : {}),
      },
      include: lobbyInclude,
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.lobby.groupBy({
      by: ["gameId"],
      where: activeLobbyWhere(),
      _count: true,
    }),
  ]);
  const counts = new Map(lobbyCounts.map((c) => [c.gameId, c._count]));
  const invite = process.env.DISCORD_INVITE_URL;

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="relative pt-6 text-center sm:pt-12">
        <div className="pointer-events-none absolute inset-x-0 -top-4 flex justify-between px-2 text-5xl opacity-70 sm:px-16">
          <span className="animate-float">🎮</span>
          <span className="animate-float" style={{ animationDelay: "1.2s" }}>👾</span>
          <span className="hidden animate-float sm:block" style={{ animationDelay: "2.4s" }}>🕹️</span>
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-purple-950/80 dark:text-purple-50 sm:text-6xl">
          Your favorite game has no matchmaking?{" "}
          <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            We do. 🫧
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg font-semibold text-purple-900/50 dark:text-purple-200/60">
          Pick a game, set your vibe — mode, platform, region — and get matched with
          players. When your party fills up, we point everyone to a Discord voice
          channel. GLHF! 💜
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/lobbies" className="btn-primary text-lg">
            🔍 Find a party
          </Link>
          <Link href="/games" className="btn-secondary text-lg">
            🎮 Browse games
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { emoji: "🎯", title: "1 · Pick your game", text: "Search the catalog and choose the mode, platform and region you want to play." },
          { emoji: "🫂", title: "2 · Fill the party", text: "Join an open party or start your own. Everyone can see exactly what you're looking for." },
          { emoji: "🔊", title: "3 · Meet in voice", text: "The moment your party is full, everyone gets sent to the same Discord voice channel." },
        ].map((s) => (
          <div key={s.title} className="bubble-card p-6 text-center">
            <div className="text-5xl">{s.emoji}</div>
            <h3 className="mt-3 text-xl font-extrabold text-purple-950/80 dark:text-purple-50">{s.title}</h3>
            <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">{s.text}</p>
          </div>
        ))}
      </section>

      {/* Open parties */}
      {lobbies.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-purple-950/80 dark:text-purple-50">Parties looking for you 👀</h2>
            <Link href="/lobbies" className="font-extrabold text-pink-500 hover:underline">
              See all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lobbies.map((l) => (
              <LobbyCard key={l.id} lobby={l} />
            ))}
          </div>
        </section>
      )}

      {/* Games */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-purple-950/80 dark:text-purple-50">Popular games 🎮</h2>
          <Link href="/games" className="font-extrabold text-pink-500 hover:underline">
            All games →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g) => (
            <GameCard key={g.id} game={g} lobbyCount={counts.get(g.id) ?? 0} />
          ))}
        </div>
      </section>

      {/* Discord CTA */}
      {invite && (
        <section className="bubble-card flex flex-col items-center gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 p-8 text-center dark:from-indigo-950/50 dark:to-purple-950/50">
          <div className="text-5xl">💬</div>
          <h2 className="text-2xl font-extrabold text-purple-950/80 dark:text-purple-50">
            All parties meet on our Discord server
          </h2>
          <p className="max-w-lg font-semibold text-purple-900/50 dark:text-purple-200/60">
            Join now so you're ready to hop into a voice channel the second your party fills up.
          </p>
          <a href={invite} target="_blank" rel="noreferrer" className="btn-discord">
            Join the Discord server
          </a>
        </section>
      )}
    </div>
  );
}
