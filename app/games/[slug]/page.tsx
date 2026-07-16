import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { activeLobbyWhere } from "@/lib/matchmaking";
import { hideBlockedLobbies, getBlockSet } from "@/lib/social";
import { lobbyInclude } from "@/lib/serialize";
import GameTile from "@/components/GameTile";
import LobbyCard from "@/components/LobbyCard";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getUser();
  const blockSet = user ? await getBlockSet(user.id) : new Set<string>();
  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      modes: { orderBy: { name: "asc" } },
      lobbies: {
        where: {
          ...activeLobbyWhere(),
          ...(user ? hideBlockedLobbies([...blockSet], user.id) : {}),
        },
        include: lobbyInclude,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!game) notFound();

  return (
    <div>
      <div className="bubble-card flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
        <GameTile
          emoji={game.emoji}
          colorA={game.colorA}
          colorB={game.colorB}
          coverUrl={game.coverUrl}
          name={game.name}
          className="h-36 w-36 shrink-0 rounded-3xl border-2 border-white shadow-lg"
          emojiClassName="text-7xl"
        />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-purple-950/80 dark:text-purple-50 sm:text-4xl">
            {game.name}
          </h1>
          {game.blurb && (
            <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">{game.blurb}</p>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            <span className="pill bg-purple-100 text-purple-600">
              👥 up to {game.maxPlayers} players
            </span>
            {game.whyLfg && (
              <span className="pill bg-pink-100 text-pink-500">🔗 {game.whyLfg}</span>
            )}
            {game.modes.map((m) => (
              <span key={m.id} className="pill bg-sky-100 text-sky-600">
                {m.name}
                {m.source === "community" && " 🌱"}
              </span>
            ))}
          </div>
          <div className="mt-5">
            <Link href={`/lobbies/new?game=${game.slug}`} className="btn-primary">
              ✨ Start a party
            </Link>
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-2xl font-extrabold text-purple-950/80 dark:text-purple-50">
        Open parties for {game.name}
      </h2>
      {game.lobbies.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {game.lobbies.map((l) => (
            <LobbyCard key={l.id} lobby={l} />
          ))}
        </div>
      ) : (
        <div className="bubble-card mt-4 p-10 text-center">
          <div className="text-5xl">🌱</div>
          <p className="mt-3 text-lg font-extrabold text-purple-900/60 dark:text-purple-200/70">
            No parties yet — be the first!
          </p>
          <Link href={`/lobbies/new?game=${game.slug}`} className="btn-primary mt-4">
            ✨ Start a party
          </Link>
        </div>
      )}
    </div>
  );
}
