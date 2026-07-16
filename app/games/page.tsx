import { prisma } from "@/lib/db";
import { activeLobbyWhere } from "@/lib/matchmaking";
import { getUser } from "@/lib/auth";
import RequestGameButton from "@/components/RequestGameButton";
import GamesBrowser from "@/components/GamesBrowser";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const [games, lobbyCounts, user] = await Promise.all([
    prisma.game.findMany({ include: { modes: true }, orderBy: { name: "asc" } }),
    prisma.lobby.groupBy({ by: ["gameId"], where: activeLobbyWhere(), _count: true }),
    getUser(),
  ]);
  const counts: Record<string, number> = {};
  for (const c of lobbyCounts) counts[c.gameId] = c._count;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-purple-950/80 dark:text-purple-50 sm:text-4xl">
            Game catalog 🎮
          </h1>
          <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">
            Find your crew across all your favorite multiplayer games — squad up,
            fill the lobby, hop into voice. 🫧
          </p>
        </div>
        <RequestGameButton loggedIn={!!user} />
      </div>

      <GamesBrowser games={games} counts={counts} />
    </div>
  );
}
