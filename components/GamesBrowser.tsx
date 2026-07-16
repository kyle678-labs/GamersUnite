"use client";

import { useMemo, useState } from "react";
import type { Game, GameMode } from "@prisma/client";
import GameCard from "./GameCard";

type GameWithModes = Game & { modes: GameMode[] };

export default function GamesBrowser({
  games,
  counts,
}: {
  games: GameWithModes[];
  counts: Record<string, number>;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return games;
    return games.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.blurb?.toLowerCase().includes(query) ||
        g.modes.some((m) => m.name.toLowerCase().includes(query))
    );
  }, [games, query]);

  return (
    <>
      <div className="mt-6 max-w-md">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search games or modes…"
            aria-label="Search games or modes"
            className="input !pl-12"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} lobbyCount={counts[g.id] ?? 0} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="bubble-card mt-8 p-10 text-center">
          <div className="text-5xl">🫥</div>
          <p className="mt-3 text-lg font-extrabold text-purple-900/60 dark:text-purple-200/70">
            No games match “{q}” yet.
          </p>
          <p className="mt-1 font-semibold text-purple-900/40 dark:text-purple-200/50">
            Don't see it? Hit “Request a game” up top and we'll look at adding it. 🎮
          </p>
        </div>
      )}
    </>
  );
}
