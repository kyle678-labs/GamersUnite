import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isModerator } from "@/lib/moderation";
import ModeratorConsole, { type ModGroup } from "@/components/ModeratorConsole";

export const dynamic = "force-dynamic";

export default async function ModeratorPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const user = await getUser();
  if (!isModerator(user)) notFound();

  const { all } = await searchParams;
  const showAll = all === "1";

  const reports = await prisma.report.findMany({
    where: showAll ? {} : { status: "open" },
    include: { reporter: true, reported: true },
    orderBy: { createdAt: "desc" },
  });

  // Group by reported user, newest report first within each group.
  const groups = new Map<string, ModGroup>();
  for (const r of reports) {
    let g = groups.get(r.reportedId);
    if (!g) {
      g = {
        user: {
          id: r.reported.id,
          username: r.reported.username,
          displayName: r.reported.displayName,
          bannedAt: r.reported.bannedAt?.toISOString() ?? null,
          banReason: r.reported.banReason,
        },
        reports: [],
        openCount: 0,
      };
      groups.set(r.reportedId, g);
    }
    g.reports.push({
      id: r.id,
      reason: r.reason,
      details: r.details,
      lobbyId: r.lobbyId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporter: { username: r.reporter.username, displayName: r.reporter.displayName },
    });
    if (r.status === "open") g.openCount += 1;
  }
  // Most-reported (by open count, then most recent) first.
  const grouped = [...groups.values()].sort(
    (a, b) =>
      b.openCount - a.openCount ||
      b.reports[0].createdAt.localeCompare(a.reports[0].createdAt)
  );

  const openTotal = reports.filter((r) => r.status === "open").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-purple-950/80 dark:text-purple-50 sm:text-4xl">
            Moderator console 🛡️
          </h1>
          <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">
            {openTotal} open report{openTotal === 1 ? "" : "s"} across {grouped.length}{" "}
            {showAll ? "reported player(s)" : "player(s)"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/moderator"
            className={showAll ? "btn-secondary" : "btn-primary"}
          >
            Open only
          </Link>
          <Link
            href="/moderator?all=1"
            className={showAll ? "btn-primary" : "btn-secondary"}
          >
            All reports
          </Link>
        </div>
      </div>

      {grouped.length > 0 ? (
        <ModeratorConsole groups={grouped} />
      ) : (
        <div className="bubble-card mt-8 p-10 text-center">
          <div className="text-5xl">🕊️</div>
          <p className="mt-3 text-lg font-extrabold text-purple-900/60 dark:text-purple-200/70">
            {showAll ? "No reports at all — squeaky clean!" : "No open reports. The community's behaving! 🎉"}
          </p>
        </div>
      )}
    </div>
  );
}
