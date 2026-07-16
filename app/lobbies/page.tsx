import Link from "next/link";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { PLATFORMS, REGIONS } from "@/lib/constants";
import { activeLobbyWhere } from "@/lib/matchmaking";
import { hideBlockedLobbies, getBlockSet } from "@/lib/social";
import { lobbyInclude } from "@/lib/serialize";
import LobbyCard from "@/components/LobbyCard";

export const dynamic = "force-dynamic";

export default async function LobbiesPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; platform?: string; region?: string; open?: string }>;
}) {
  const { game, platform, region, open } = await searchParams;
  const user = await getUser();
  const blockSet = user ? await getBlockSet(user.id) : new Set<string>();
  const [games, lobbies] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    prisma.lobby.findMany({
      where: {
        ...activeLobbyWhere(),
        ...(user ? hideBlockedLobbies([...blockSet], user.id) : {}),
        ...(open === "1" ? { status: "open" } : {}),
        ...(game ? { game: { slug: game } } : {}),
        ...(platform ? { platform } : {}),
        ...(region ? { region } : {}),
      },
      include: lobbyInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-purple-950/80 dark:text-purple-50 sm:text-4xl">
            Find a party 🔍
          </h1>
          <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">
            Filter by game, platform and region — or start your own.
          </p>
        </div>
        <Link href="/lobbies/new" className="btn-primary">
          ✨ Start a party
        </Link>
      </div>

      <form method="GET" className="bubble-card mt-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-40 flex-1">
          <label className="label">Game</label>
          <select name="game" defaultValue={game ?? ""} className="input">
            <option value="">All games</option>
            {games.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-36 flex-1">
          <label className="label">Platform</label>
          <select name="platform" defaultValue={platform ?? ""} className="input">
            <option value="">Any</option>
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="min-w-36 flex-1">
          <label className="label">Region</label>
          <select name="region" defaultValue={region ?? ""} className="input">
            <option value="">Anywhere</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-3 font-bold text-purple-900/60 dark:text-purple-200/70">
          <input
            type="checkbox"
            name="open"
            value="1"
            defaultChecked={open === "1"}
            className="h-5 w-5 accent-pink-400"
          />
          Open spots only
        </label>
        <button type="submit" className="btn-secondary">
          Filter 🫧
        </button>
      </form>

      {lobbies.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lobbies.map((l) => (
            <LobbyCard key={l.id} lobby={l} />
          ))}
        </div>
      ) : (
        <div className="bubble-card mt-6 p-10 text-center">
          <div className="text-5xl">🦗</div>
          <p className="mt-3 text-lg font-extrabold text-purple-900/60 dark:text-purple-200/70">
            No parties match those filters right now.
          </p>
          <Link href="/lobbies/new" className="btn-primary mt-4">
            ✨ Start one yourself
          </Link>
        </div>
      )}
    </div>
  );
}
