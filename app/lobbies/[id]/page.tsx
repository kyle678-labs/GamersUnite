import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { getBlockSet, isLobbyHiddenFrom } from "@/lib/social";
import { lobbyInclude, serializeLobby } from "@/lib/serialize";
import LobbyLive from "@/components/LobbyLive";

export const dynamic = "force-dynamic";

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, lobby] = await Promise.all([
    getUser(),
    prisma.lobby.findUnique({ where: { id }, include: lobbyInclude }),
  ]);
  if (!lobby) notFound();

  // A blocked party is invisible even via direct link.
  if (user) {
    const blockSet = await getBlockSet(user.id);
    if (isLobbyHiddenFrom(lobby.members, blockSet, user.id)) notFound();
  }

  return (
    <LobbyLive
      initial={serializeLobby(lobby, user?.id)}
      loggedIn={!!user}
      currentUserId={user?.id ?? null}
    />
  );
}
