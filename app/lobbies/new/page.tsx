import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import CreateLobbyForm from "@/components/CreateLobbyForm";

export const dynamic = "force-dynamic";

export default async function NewLobbyPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game } = await searchParams;
  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/lobbies/new${game ? `?game=${game}` : ""}`)}`);
  }

  const games = await prisma.game.findMany({
    include: { modes: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-extrabold text-purple-950/80 dark:text-purple-50 sm:text-4xl">
        Start a party ✨
      </h1>
      <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">
        Tell everyone what you want to play. Once the party fills up, you'll all be
        pointed to a Discord voice channel. 🔊
      </p>
      <CreateLobbyForm
        games={games.map((g) => ({
          slug: g.slug,
          name: g.name,
          maxPlayers: g.maxPlayers,
          coverUrl: g.coverUrl,
          modes: g.modes.map((m) => m.name),
        }))}
        initialGame={game ?? null}
      />
    </div>
  );
}
