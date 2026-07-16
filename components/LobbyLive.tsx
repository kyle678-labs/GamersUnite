"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LobbyJson } from "@/lib/types";
import GameTile from "./GameTile";
import AvatarBubble from "./AvatarBubble";
import ReportDialog from "./ReportDialog";

const POLL_MS = 4000;

export default function LobbyLive({
  initial,
  loggedIn,
  currentUserId,
}: {
  initial: LobbyJson;
  loggedIn: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [lobby, setLobby] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [needsDiscord, setNeedsDiscord] = useState<string | null>(null); // invite url
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Poll so everyone in the lobby sees joins/leaves/"party full" live.
  useEffect(() => {
    if (lobby.status === "closed") return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/lobbies/${initial.id}`, { cache: "no-store" });
        if (res.ok) setLobby((await res.json()).lobby);
      } catch {
        /* transient network hiccup — next tick will retry */
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [initial.id, lobby.status]);

  const act = useCallback(
    async (action: "join" | "leave" | "close") => {
      if (!loggedIn) {
        router.push(`/login?next=${encodeURIComponent(`/lobbies/${initial.id}`)}`);
        return;
      }
      setBusy(true);
      setError(null);
      setNeedsDiscord(null);
      const res = await fetch(`/api/lobbies/${initial.id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. 😿");
        if (data.code === "not_in_guild") setNeedsDiscord(data.inviteUrl ?? "");
      } else {
        setLobby(data.lobby);
      }
      setBusy(false);
    },
    [initial.id, loggedIn, router]
  );

  const filled = lobby.members.length;
  const spotsLeft = Math.max(0, lobby.size - filled);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="bubble-card flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-start">
        <GameTile
          emoji={lobby.game.emoji}
          colorA={lobby.game.colorA}
          colorB={lobby.game.colorB}
          coverUrl={lobby.game.coverUrl}
          name={lobby.game.name}
          className="h-28 w-28 shrink-0 rounded-3xl border-2 border-white shadow-lg"
          emojiClassName="text-6xl"
        />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-extrabold text-purple-950/80 dark:text-purple-50 sm:text-3xl">
              <Link href={`/games/${lobby.game.slug}`} className="hover:underline">
                {lobby.game.name}
              </Link>{" "}
              party
            </h1>
            {lobby.status === "open" && (
              <span className="pill bg-pink-100 text-pink-500">🔍 Looking for players</span>
            )}
            {lobby.status === "live" && (
              <span className="pill bg-lime-100 text-lime-600">🎮 Live — jump in!</span>
            )}
            {lobby.status === "full" && (
              <span className="pill bg-emerald-100 text-emerald-600">🎉 Party full!</span>
            )}
            {lobby.status === "closed" && (
              <span className="pill bg-slate-100 text-slate-500">💤 Ended</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {lobby.mode && <span className="pill bg-purple-100 text-purple-600">🎯 {lobby.mode}</span>}
            {lobby.platform && <span className="pill bg-sky-100 text-sky-600">🕹️ {lobby.platform}</span>}
            {lobby.region && <span className="pill bg-amber-100 text-amber-600">🌍 {lobby.region}</span>}
            {lobby.skillLevel && <span className="pill bg-lime-100 text-lime-600">💪 {lobby.skillLevel}</span>}
            {lobby.micRequired && <span className="pill bg-rose-100 text-rose-500">🎙️ Mic required</span>}
          </div>
          {lobby.note && (
            <p className="mt-3 rounded-2xl bg-purple-50/70 px-4 py-2 font-semibold text-purple-900/60 dark:bg-white/5 dark:text-purple-200/70">
              “{lobby.note}” — {lobby.host.displayName}
            </p>
          )}
        </div>
      </div>

      {/* Voice channel handoff */}
      {(lobby.status === "full" || lobby.status === "live") && (
        <div className="bubble-card border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 text-center dark:border-emerald-400/20 dark:from-emerald-950/50 dark:to-teal-950/40">
          <div className="text-5xl">🔊</div>
          {lobby.voice ? (
            <>
              <h2 className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                You're matched! Hop into{" "}
                <span className="underline decoration-wavy decoration-emerald-300">
                  {lobby.voice.channelName}
                </span>
              </h2>
              <p className="mt-1 font-semibold text-emerald-700/60 dark:text-emerald-200/60">
                This room is locked to your party{lobby.status === "live"
                  ? ` — and ${spotsLeft} more can still join. 🔐`
                  : ` — only the ${lobby.size} of you can connect. 🔐`}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {lobby.voice.appUrl && (
                  <a href={lobby.voice.appUrl} className="btn-discord">
                    🎧 Open in Discord app
                  </a>
                )}
                {lobby.voice.url && (
                  <a href={lobby.voice.url} target="_blank" rel="noreferrer" className="btn-secondary">
                    🌐 Open in browser
                  </a>
                )}
              </div>
              {lobby.inviteUrl && (
                <p className="mt-3 text-sm font-bold text-emerald-700/50 dark:text-emerald-200/50">
                  Not on the server yet?{" "}
                  <a href={lobby.inviteUrl} target="_blank" rel="noreferrer" className="underline">
                    Join it first
                  </a>{" "}
                  — then hop in.
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                You're matched! 🎉
              </h2>
              <p className="mt-1 font-semibold text-emerald-700/60 dark:text-emerald-200/60">
                All party rooms are busy right now — meet in any open voice channel on
                the Discord server.
              </p>
              {lobby.inviteUrl && (
                <a href={lobby.inviteUrl} target="_blank" rel="noreferrer" className="btn-discord mt-4">
                  💬 Open the Discord server
                </a>
              )}
            </>
          )}
        </div>
      )}

      {/* Roster */}
      <div className="bubble-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-purple-950/80 dark:text-purple-50">Party roster</h2>
          <span className="pill bg-purple-100 text-purple-600">
            {filled}/{lobby.size} players
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {lobby.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border-2 border-purple-50 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5"
            >
              <AvatarBubble username={m.username} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-purple-950/80 dark:text-purple-50">{m.displayName}</p>
                <p className="truncate text-sm font-semibold text-purple-300">
                  @{m.username} {m.id === lobby.host.id && "· 👑 host"}
                </p>
              </div>
              {loggedIn && currentUserId && m.id !== currentUserId && (
                <button
                  onClick={() => setReportTarget({ id: m.id, name: m.displayName })}
                  title={`Report ${m.displayName}`}
                  className="shrink-0 rounded-full px-2 py-1 text-purple-300 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                >
                  🚩
                </button>
              )}
            </div>
          ))}
          {Array.from({ length: spotsLeft }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-purple-200 bg-white/50 px-4 py-3 dark:border-purple-200/25 dark:bg-white/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-purple-200 text-purple-300">
                ?
              </div>
              <p className="font-bold text-purple-300">Waiting for a player…</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 dark:bg-rose-950/40">
            <p className="font-bold text-rose-500 dark:text-rose-300">{error}</p>
            {needsDiscord !== null && needsDiscord && (
              <a
                href={needsDiscord}
                target="_blank"
                rel="noreferrer"
                className="btn-discord mt-3"
              >
                💬 Join the Discord server
              </a>
            )}
            {needsDiscord !== null && (
              <p className="mt-2 text-sm font-bold text-rose-400 dark:text-rose-300/70">
                Once you're in, hit join again!
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {lobby.status !== "closed" && !lobby.isMember && (
            <button onClick={() => act("join")} disabled={busy || spotsLeft === 0} className="btn-primary">
              {spotsLeft === 0 ? "Party is full 😢" : "🙌 Join this party"}
            </button>
          )}
          {lobby.isMember && lobby.status !== "closed" && (
            <button onClick={() => act("leave")} disabled={busy} className="btn-secondary">
              👋 Leave party
            </button>
          )}
          {lobby.isHost && lobby.status !== "closed" && (
            <button
              onClick={() => act("close")}
              disabled={busy}
              className="rounded-full px-5 py-2.5 font-extrabold text-rose-400 transition hover:bg-rose-50"
            >
              🛑 End party
            </button>
          )}
          {lobby.status === "closed" && (
            <Link href="/lobbies" className="btn-primary">
              🔍 Find another party
            </Link>
          )}
        </div>

        {lobby.status === "open" && (
          <p className="mt-4 text-sm font-bold text-purple-300">
            💡 Voice opens at {lobby.minSize} players. Share this page with friends —
            the party updates live as players hop in.
          </p>
        )}
      </div>

      {reportTarget && (
        <ReportDialog
          userId={reportTarget.id}
          displayName={reportTarget.name}
          lobbyId={lobby.id}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
