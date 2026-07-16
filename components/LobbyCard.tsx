import Link from "next/link";
import type { LobbyWithRelations } from "@/lib/serialize";
import GameTile from "./GameTile";
import AvatarBubble from "./AvatarBubble";

export default function LobbyCard({ lobby }: { lobby: LobbyWithRelations }) {
  const filled = lobby.members.length;
  const isFull = lobby.status === "full" || filled >= lobby.size;
  const isLive = !isFull && lobby.status === "live";
  return (
    <Link
      href={`/lobbies/${lobby.id}`}
      className="bubble-card block p-4 transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex items-start gap-3">
        <GameTile
          emoji={lobby.game.emoji}
          colorA={lobby.game.colorA}
          colorB={lobby.game.colorB}
          coverUrl={lobby.game.coverUrl}
          name={lobby.game.name}
          className="h-16 w-16 rounded-2xl border-2 border-white shadow"
          emojiClassName="text-3xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-lg font-extrabold text-purple-950/80 dark:text-purple-50">
              {lobby.game.name}
            </h3>
            {isFull ? (
              <span className="pill bg-emerald-100 text-emerald-600">Full 🎉</span>
            ) : isLive ? (
              <span className="pill bg-lime-100 text-lime-600">
                🎮 Live · {lobby.size - filled} spot{lobby.size - filled === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="pill bg-pink-100 text-pink-500">
                {lobby.size - filled} spot{lobby.size - filled === 1 ? "" : "s"} left
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {lobby.mode && <span className="pill bg-purple-100 text-purple-600">🎯 {lobby.mode}</span>}
            {lobby.platform && <span className="pill bg-sky-100 text-sky-600">🕹️ {lobby.platform}</span>}
            {lobby.region && <span className="pill bg-amber-100 text-amber-600">🌍 {lobby.region}</span>}
            {lobby.micRequired && <span className="pill bg-rose-100 text-rose-500">🎙️ Mic</span>}
          </div>
        </div>
      </div>
      {lobby.note && (
        <p className="mt-3 line-clamp-2 rounded-2xl bg-purple-50/70 px-3 py-2 text-sm font-semibold text-purple-900/60 dark:bg-white/5 dark:text-purple-200/70">
          “{lobby.note}”
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-2">
          {lobby.members.slice(0, 5).map((m) => (
            <AvatarBubble key={m.id} username={m.user.username} size="sm" title={m.user.displayName} />
          ))}
          {Array.from({ length: Math.max(0, Math.min(lobby.size - filled, 5 - Math.min(filled, 5))) }).map((_, i) => (
            <div
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-purple-200 bg-white/60 text-xs text-purple-300 dark:border-purple-200/30 dark:bg-white/5"
            >
              ?
            </div>
          ))}
        </div>
        <span className="text-sm font-extrabold text-purple-400">
          {filled}/{lobby.size} players
          {!isFull && !isLive && lobby.minSize > filled && (
            <span className="text-purple-300"> · voice at {lobby.minSize}</span>
          )}
        </span>
      </div>
    </Link>
  );
}
