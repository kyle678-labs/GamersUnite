"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvatarBubble from "./AvatarBubble";
import ReportDialog from "./ReportDialog";
import type { RecentTeammate } from "@/lib/social";

function agoLabel(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function TeammateCard({ player }: { player: RecentTeammate }) {
  const router = useRouter();
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function block() {
    setBusy(true);
    const res = await fetch(`/api/users/${player.id}/block`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh(); // drops them from this list into "Blocked"
  }

  return (
    <>
      <div className="bubble-card flex items-center gap-3 p-4">
        <AvatarBubble username={player.username} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold text-purple-950/80 dark:text-purple-50">
            {player.displayName}
          </p>
          <p className="truncate text-sm font-semibold text-purple-300">
            {player.sharedParties} part{player.sharedParties === 1 ? "y" : "ies"} · {agoLabel(player.lastPlayedAt)}
          </p>
        </div>
        <button
          onClick={() => setReporting(true)}
          title={`Report ${player.displayName}`}
          className="rounded-full px-2 py-1 text-lg transition hover:bg-purple-100 dark:hover:bg-white/10"
        >
          🚩
        </button>
        <button
          onClick={block}
          disabled={busy}
          className="rounded-full border-2 border-purple-200 px-3 py-1.5 text-sm font-extrabold text-purple-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:border-purple-300/25 dark:text-purple-200 dark:hover:bg-rose-950/40"
        >
          🚫 Block
        </button>
      </div>
      {reporting && (
        <ReportDialog
          userId={player.id}
          displayName={player.displayName}
          onClose={() => setReporting(false)}
        />
      )}
    </>
  );
}
