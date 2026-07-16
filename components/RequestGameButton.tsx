"use client";

import { useState } from "react";

export default function RequestGameButton({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [gameName, setGameName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    setOpen(false);
    // Reset for next time (after the closing animation is irrelevant here).
    setDone(false);
    setError(null);
    setGameName("");
    setNote("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (gameName.trim().length < 2) {
      setError("Tell us which game you'd like to see.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/game-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameName, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't send your request. 😿");
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary whitespace-nowrap">
        ➕ Request a game
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="bubble-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center">
                <div className="text-5xl">🎉</div>
                <h2 className="mt-3 text-xl font-extrabold text-purple-950/80 dark:text-purple-50">
                  Request sent!
                </h2>
                <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">
                  Thanks — the team will take a look at adding{" "}
                  <span className="font-extrabold">{gameName.trim()}</span> to the catalog.
                </p>
                <button onClick={close} className="btn-primary mt-5">
                  Done
                </button>
              </div>
            ) : !loggedIn ? (
              <div className="text-center">
                <div className="text-5xl">🔒</div>
                <h2 className="mt-3 text-xl font-extrabold text-purple-950/80 dark:text-purple-50">
                  Log in to request a game
                </h2>
                <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">
                  Sign in with Discord and you can request any game you'd like to see here.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <button onClick={close} className="btn-secondary">
                    Cancel
                  </button>
                  <a href="/login" className="btn-primary">
                    Log in
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 className="text-xl font-extrabold text-purple-950/80 dark:text-purple-50">
                  Request a game 🎮
                </h2>
                <p className="mt-1 font-semibold text-purple-900/50 dark:text-purple-200/60">
                  Don't see your game? Let us know and we'll look at adding it.
                </p>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  maxLength={100}
                  placeholder="Game name (e.g. Sea of Thieves)"
                  className="input mt-4"
                  autoFocus
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Anything to add? Platform, why it's a good fit… (optional)"
                  className="input mt-3 resize-none"
                />
                {error && (
                  <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 font-bold text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">
                    {error}
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={close} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={busy} className="btn-primary">
                    {busy ? "Sending…" : "➕ Send request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
