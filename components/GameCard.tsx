import Link from "next/link";
import type { Game, GameMode } from "@prisma/client";
import GameTile from "./GameTile";

export default function GameCard({
  game,
  lobbyCount,
}: {
  game: Game & { modes: GameMode[] };
  lobbyCount: number;
}) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="bubble-card group block overflow-hidden transition hover:-translate-y-1 hover:shadow-xl"
    >
      <GameTile
        emoji={game.emoji}
        colorA={game.colorA}
        colorB={game.colorB}
        coverUrl={game.coverUrl}
        name={game.name}
        className="h-32 w-full"
        emojiClassName="text-6xl transition group-hover:scale-125"
      />
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-lg font-extrabold text-purple-950/80 dark:text-purple-50">{game.name}</h3>
          <span className="pill shrink-0 bg-purple-100 text-purple-500">
            👥 {game.maxPlayers}
          </span>
        </div>
        {game.whyLfg && (
          <p className="mt-1 text-xs font-bold text-pink-400">🔗 {game.whyLfg}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {game.modes.slice(0, 3).map((m) => (
            <span key={m.id} className="pill bg-sky-50 text-xs text-sky-500">
              {m.name}
            </span>
          ))}
          {game.modes.length > 3 && (
            <span className="pill bg-slate-50 text-xs text-slate-400">
              +{game.modes.length - 3}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm font-extrabold text-purple-400">
          {lobbyCount > 0 ? `🔥 ${lobbyCount} open part${lobbyCount === 1 ? "y" : "ies"}` : "Start the first party ✨"}
        </p>
      </div>
    </Link>
  );
}
