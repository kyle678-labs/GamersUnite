import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { lobbyInclude } from "@/lib/serialize";
import { activeLobbyWhere } from "@/lib/matchmaking";
import { getBlockSet, getMyBlocks, getRecentTeammates, hideBlockedLobbies } from "@/lib/social";
import AvatarBubble from "@/components/AvatarBubble";
import LobbyCard from "@/components/LobbyCard";
import LogoutButton from "@/components/LogoutButton";
import TeammateCard from "@/components/TeammateCard";
import BlockedCard from "@/components/BlockedCard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile");

  const blockSet = await getBlockSet(user.id);
  const [myLobbies, teammates, blocked] = await Promise.all([
    prisma.lobby.findMany({
      where: {
        ...activeLobbyWhere(),
        ...hideBlockedLobbies([...blockSet], user.id),
        members: { some: { userId: user.id } },
      },
      include: lobbyInclude,
      orderBy: { createdAt: "desc" },
    }),
    getRecentTeammates(user.id),
    getMyBlocks(user.id),
  ]);

  return (
    <div>
      <div className="bubble-card flex flex-col items-center gap-5 p-6 sm:flex-row">
        <AvatarBubble username={user.username} size="lg" />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-purple-950/80 dark:text-purple-50">{user.displayName}</h1>
          <p className="font-bold text-purple-300">@{user.username}</p>
          {user.discordId && (
            <p className="mt-1 text-sm font-bold text-[#5865F2]">✓ Linked to Discord</p>
          )}
        </div>
        <LogoutButton />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-purple-950/80 dark:text-purple-50">My parties 🎉</h2>
        <Link href="/lobbies/new" className="btn-primary">
          ✨ Start a party
        </Link>
      </div>
      {myLobbies.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myLobbies.map((l) => (
            <LobbyCard key={l.id} lobby={l} />
          ))}
        </div>
      ) : (
        <div className="bubble-card mt-4 p-10 text-center">
          <div className="text-5xl">🛋️</div>
          <p className="mt-3 text-lg font-extrabold text-purple-900/60 dark:text-purple-200/70">
            You're not in any parties right now.
          </p>
          <Link href="/lobbies" className="btn-primary mt-4">
            🔍 Find one
          </Link>
        </div>
      )}

      {/* Recent teammates */}
      <h2 className="mt-12 text-2xl font-extrabold text-purple-950/80 dark:text-purple-50">
        Recent teammates 🤝
      </h2>
      <p className="mt-1 font-semibold text-purple-900/50 dark:text-purple-200/60">
        People you've partied with lately. Block anyone you'd rather not be matched with
        again, or report bad behavior.
      </p>
      {teammates.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teammates.map((p) => (
            <TeammateCard key={p.id} player={p} />
          ))}
        </div>
      ) : (
        <div className="bubble-card mt-4 p-8 text-center">
          <div className="text-4xl">🌱</div>
          <p className="mt-2 font-extrabold text-purple-900/60 dark:text-purple-200/70">
            No teammates yet — join a party to meet some players!
          </p>
        </div>
      )}

      {/* Blocked accounts */}
      {blocked.length > 0 && (
        <>
          <h2 className="mt-12 text-2xl font-extrabold text-purple-950/80 dark:text-purple-50">
            Blocked accounts 🚫
          </h2>
          <p className="mt-1 font-semibold text-purple-900/50 dark:text-purple-200/60">
            You won't see each other's parties. Unblock anytime.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {blocked.map((p) => (
              <BlockedCard key={p.id} player={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
