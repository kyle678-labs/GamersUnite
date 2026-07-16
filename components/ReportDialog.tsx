"use client";

import { useState } from "react";
import { REPORT_REASONS } from "@/lib/social";

export default function ReportDialog({
  userId,
  displayName,
  lobbyId,
  onClose,
}: {
  userId: string;
  displayName: string;
  lobbyId?: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Please pick a reason.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedId: userId, reason, details, lobbyId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't send the report. 😿");
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bubble-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center">
            <div className="text-5xl">🛟</div>
            <h2 className="mt-3 text-xl font-extrabold text-purple-950/80 dark:text-purple-50">
              Thanks for looking out
            </h2>
            <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">
              Our mods will review your report on {displayName}. You can block them too
              if you'd rather not be matched again.
            </p>
            <button onClick={onClose} className="btn-primary mt-5">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-xl font-extrabold text-purple-950/80 dark:text-purple-50">
              Report {displayName}
            </h2>
            <p className="mt-1 font-semibold text-purple-900/50 dark:text-purple-200/60">
              Help us keep GamersUnite friendly. Reports are private.
            </p>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2.5 font-bold transition ${
                    reason === r.value
                      ? "border-pink-300 bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300"
                      : "border-purple-100 text-purple-900/70 dark:border-white/10 dark:text-purple-200/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-4 w-4 accent-pink-400"
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Anything else the mods should know? (optional)"
              className="input mt-3 resize-none"
            />
            {error && (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 font-bold text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? "Sending…" : "🚩 Submit report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
