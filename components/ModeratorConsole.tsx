"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvatarBubble from "./AvatarBubble";

export type ModGroup = {
  user: {
    id: string;
    username: string;
    displayName: string;
    bannedAt: string | null;
    banReason: string | null;
  };
  reports: {
    id: string;
    reason: string;
    details: string | null;
    lobbyId: string | null;
    status: string;
    createdAt: string;
    reporter: { username: string; displayName: string };
  }[];
  openCount: number;
};

const REASON_LABELS: Record<string, string> = {
  toxic: "💢 Toxic behavior",
  cheating: "🎭 Cheating",
  scam: "🎣 Scam / phishing",
  name: "🚫 Offensive name",
  other: "❓ Other",
};

const STATUS_PILLS: Record<string, string> = {
  open: "bg-amber-100 text-amber-600",
  reviewed: "bg-sky-100 text-sky-600",
  actioned: "bg-rose-100 text-rose-500",
};

export default function ModeratorConsole({ groups }: { groups: ModGroup[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [banFormFor, setBanFormFor] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function act(key: string, url: string, init?: RequestInit) {
    setBusy(key);
    setError(null);
    const res = await fetch(url, { method: "POST", ...init });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. 😿");
    }
    setBusy(null);
    setBanFormFor(null);
    setBanReason("");
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-5">
      {error && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 font-bold text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}
      {groups.map((g) => (
        <div key={g.user.id} className="bubble-card p-5">
          {/* Reported player header */}
          <div className="flex flex-wrap items-center gap-3">
            <AvatarBubble username={g.user.username} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold text-purple-950/80 dark:text-purple-50">
                {g.user.displayName}
                <span className="ml-2 text-sm font-bold text-purple-300">
                  @{g.user.username}
                </span>
              </p>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                {g.openCount > 0 && (
                  <span className="pill bg-amber-100 text-amber-600">
                    {g.openCount} open report{g.openCount === 1 ? "" : "s"}
                  </span>
                )}
                {g.user.bannedAt && (
                  <span className="pill bg-rose-100 text-rose-500" title={g.user.banReason ?? undefined}>
                    ⛔ Banned
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {g.user.bannedAt ? (
                <button
                  onClick={() => act(`unban-${g.user.id}`, `/api/moderator/users/${g.user.id}/ban`, { method: "DELETE" })}
                  disabled={busy !== null}
                  className="btn-secondary"
                >
                  {busy === `unban-${g.user.id}` ? "…" : "♻️ Unban"}
                </button>
              ) : banFormFor === g.user.id ? null : (
                <button
                  onClick={() => setBanFormFor(g.user.id)}
                  disabled={busy !== null}
                  className="rounded-full border-2 border-rose-200 bg-white px-5 py-2.5 font-extrabold text-rose-500 transition hover:scale-105 hover:border-rose-300 dark:border-rose-400/30 dark:bg-white/10 dark:text-rose-300"
                >
                  ⛔ Ban player
                </button>
              )}
            </div>
          </div>

          {/* Ban confirmation form */}
          {banFormFor === g.user.id && !g.user.bannedAt && (
            <div className="mt-4 rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-4 dark:border-rose-400/30 dark:bg-rose-950/30">
              <p className="font-bold text-rose-600 dark:text-rose-300">
                Ban @{g.user.username}? This logs them out everywhere, closes their
                parties, revokes voice access, and blocks future logins.
              </p>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                maxLength={300}
                placeholder="Reason (optional, kept on record)"
                className="input mt-3"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    act(`ban-${g.user.id}`, `/api/moderator/users/${g.user.id}/ban`, {
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ reason: banReason || null }),
                    })
                  }
                  disabled={busy !== null}
                  className="rounded-full bg-rose-500 px-6 py-2.5 font-extrabold text-white transition hover:scale-105 disabled:opacity-50"
                >
                  {busy === `ban-${g.user.id}` ? "Banning…" : "Confirm ban"}
                </button>
                <button onClick={() => setBanFormFor(null)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Reports against this player */}
          <ul className="mt-4 space-y-2">
            {g.reports.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-purple-50 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5"
              >
                <span className="pill bg-purple-100 text-purple-600">
                  {REASON_LABELS[r.reason] ?? r.reason}
                </span>
                <span className={`pill ${STATUS_PILLS[r.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {r.status}
                </span>
                <span className="text-sm font-bold text-purple-300">
                  by @{r.reporter.username} · {new Date(r.createdAt).toLocaleString()}
                </span>
                {r.details && (
                  <p className="w-full font-semibold text-purple-900/60 dark:text-purple-200/70">
                    “{r.details}”
                  </p>
                )}
                {r.status === "open" && (
                  <button
                    onClick={() => act(`review-${r.id}`, `/api/moderator/reports/${r.id}/review`)}
                    disabled={busy !== null}
                    className="ml-auto rounded-full px-4 py-1.5 text-sm font-extrabold text-sky-500 transition hover:bg-sky-50 dark:hover:bg-white/10"
                  >
                    {busy === `review-${r.id}` ? "…" : "✓ Mark reviewed"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
