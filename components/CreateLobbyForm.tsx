"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORMS, REGIONS, SKILL_LEVELS } from "@/lib/constants";

type GameOption = {
  slug: string;
  name: string;
  maxPlayers: number;
  coverUrl: string | null;
  modes: string[];
};

function GameThumb({ game }: { game: GameOption }) {
  return game.coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={game.coverUrl}
      alt=""
      className="h-9 w-16 shrink-0 rounded-lg border border-white/40 object-cover"
    />
  ) : (
    <div className="flex h-9 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 text-sm font-extrabold text-purple-400 dark:from-purple-900/60 dark:to-pink-900/40">
      {game.name.slice(0, 1)}
    </div>
  );
}

export default function CreateLobbyForm({
  games,
  initialGame,
}: {
  games: GameOption[];
  initialGame: string | null;
}) {
  const router = useRouter();
  const [gameSlug, setGameSlug] = useState(
    initialGame && games.some((g) => g.slug === initialGame) ? initialGame : games[0]?.slug ?? ""
  );
  const [gameQuery, setGameQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mode, setMode] = useState("");
  const [platform, setPlatform] = useState("PC");
  const [region, setRegion] = useState("");
  const [skillLevel, setSkillLevel] = useState(SKILL_LEVELS[0]);
  const [minSize, setMinSize] = useState(2);
  const [size, setSize] = useState(4);
  const [micRequired, setMicRequired] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsDiscord, setNeedsDiscord] = useState<string | null>(null); // invite url
  const [busy, setBusy] = useState(false);

  const game = useMemo(() => games.find((g) => g.slug === gameSlug), [games, gameSlug]);
  const maxPlayers = game?.maxPlayers ?? 16;
  const cap = Math.min(Math.max(size, 2), maxPlayers);
  const min = Math.min(Math.max(minSize, 2), cap);

  const filtered = useMemo(() => {
    const q = gameQuery.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q));
  }, [games, gameQuery]);

  function pickGame(slug: string) {
    setGameSlug(slug);
    setMode("");
    setPickerOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/lobbies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameSlug,
        mode,
        platform,
        region: region || null,
        skillLevel,
        size: cap,
        minSize: min,
        micRequired,
        note,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. 😿");
      setNeedsDiscord(data.code === "not_in_guild" ? (data.inviteUrl ?? "") : null);
      setBusy(false);
      return;
    }
    router.push(`/lobbies/${data.lobby.id}`);
  }

  return (
    <form onSubmit={submit} className="bubble-card mt-6 space-y-5 p-6">
      <div>
        <label className="label">Game</label>
        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {game && !pickerOpen ? (
              <GameThumb game={game} />
            ) : (
              <span className="pl-1 text-xl">🔍</span>
            )}
          </div>
          <input
            type="text"
            value={pickerOpen ? gameQuery : (game?.name ?? "")}
            onFocus={() => {
              setPickerOpen(true);
              setGameQuery("");
            }}
            onClick={() => {
              // focus events can be swallowed (e.g. unfocused window) — a
              // click on the field should always open the picker
              if (!pickerOpen) {
                setPickerOpen(true);
                setGameQuery("");
              }
            }}
            onBlur={() => setPickerOpen(false)}
            onChange={(e) => setGameQuery(e.target.value)}
            placeholder="Search games…"
            className={`input ${game && !pickerOpen ? "!pl-24" : "!pl-12"}`}
            aria-label="Search games"
          />
          {pickerOpen && (
            <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border-2 border-purple-100 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#221a3a]">
              {filtered.map((g) => (
                <li key={g.slug}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // fire before the input's blur
                      pickGame(g.slug);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-bold transition hover:bg-purple-50 dark:hover:bg-white/10 ${
                      g.slug === gameSlug
                        ? "text-pink-500"
                        : "text-purple-950/80 dark:text-purple-100"
                    }`}
                  >
                    <GameThumb game={g} />
                    <span className="truncate">{g.name}</span>
                    <span className="ml-auto shrink-0 text-xs font-extrabold text-purple-300">
                      up to {g.maxPlayers}
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-3 font-semibold text-slate-400">
                  No games match “{gameQuery}”
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div>
        <label className="label">Game mode</label>
        <input
          type="text"
          list="mode-suggestions"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          placeholder={game?.modes[0] ? `e.g. ${game.modes.slice(0, 3).join(", ")}…` : "Any mode"}
          className="input"
        />
        <datalist id="mode-suggestions">
          {game?.modes.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <p className="mt-1.5 text-xs font-bold text-purple-400">
          🌱 Pick a suggestion or type your own — new modes are saved and suggested to
          future hosts of this game.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Platform</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input">
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Region</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="input">
            <option value="">Anywhere 🌍</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Skill vibe</label>
          <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="input">
            {SKILL_LEVELS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-3 self-end rounded-2xl border-2 border-purple-100 bg-white px-4 py-3 font-bold text-purple-900/60 dark:border-white/10 dark:bg-white/5 dark:text-purple-200/70">
          <input
            type="checkbox"
            checked={micRequired}
            onChange={(e) => setMicRequired(e.target.checked)}
            className="h-5 w-5 accent-pink-400"
          />
          🎙️ Mic required
        </label>
      </div>

      <div className="rounded-2xl border-2 border-purple-100 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Voice opens at</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={maxPlayers}
                value={min}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMinSize(v);
                  if (v > cap) setSize(v);
                }}
                className="w-full accent-pink-400"
              />
              <span className="w-14 shrink-0 rounded-2xl bg-purple-100 py-2 text-center font-extrabold text-purple-600 dark:bg-white/10 dark:text-purple-200">
                {min}
              </span>
            </div>
          </div>
          <div>
            <label className="label">
              Party cap <span className="text-purple-300">(max {maxPlayers})</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={maxPlayers}
                value={cap}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSize(v);
                  if (v < min) setMinSize(v);
                }}
                className="w-full accent-purple-400"
              />
              <span className="w-14 shrink-0 rounded-2xl bg-purple-100 py-2 text-center font-extrabold text-purple-600 dark:bg-white/10 dark:text-purple-200">
                {cap}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold text-purple-400">
          {min === cap
            ? `🔊 The voice channel opens when all ${cap} players are in.`
            : `🔊 The voice channel opens at ${min} players — up to ${cap} can keep joining after the party starts.`}
        </p>
      </div>

      <div>
        <label className="label">Note for joiners (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="e.g. Chill run, newbies welcome! Starting around 8pm EST."
          className="input resize-none"
        />
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 dark:bg-rose-950/40">
          <p className="font-bold text-rose-500 dark:text-rose-300">{error}</p>
          {needsDiscord !== null && needsDiscord && (
            <a href={needsDiscord} target="_blank" rel="noreferrer" className="btn-discord mt-3">
              💬 Join the Discord server
            </a>
          )}
        </div>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full text-lg">
        {busy ? "Creating… 🫧" : "🎉 Open the party"}
      </button>
    </form>
  );
}
