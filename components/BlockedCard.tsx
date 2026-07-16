"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvatarBubble from "./AvatarBubble";

export default function BlockedCard({
  player,
}: {
  player: { id: string; username: string; displayName: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function unblock() {
    setBusy(true);
    const res = await fetch(`/api/users/${player.id}/block`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-purple-50 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <AvatarBubble username={player.username} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold text-purple-950/80 dark:text-purple-50">
          {player.displayName}
        </p>
        <p className="truncate text-sm font-semibold text-purple-300">@{player.username}</p>
      </div>
      <button onClick={unblock} disabled={busy} className="btn-secondary !px-4 !py-1.5 text-sm">
        {busy ? "…" : "Unblock"}
      </button>
    </div>
  );
}
