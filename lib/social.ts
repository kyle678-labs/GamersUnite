import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const REPORT_REASONS = [
  { value: "toxic", label: "Toxic / harassment" },
  { value: "cheating", label: "Cheating" },
  { value: "scam", label: "Scam / spam" },
  { value: "name", label: "Inappropriate name" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

// Everyone the viewer can't see / can't be seen by: users they blocked AND
// users who blocked them. Blocks are enforced symmetrically so a blocked
// account can't see the blocker's parties either.
export async function getBlockSet(userId: string): Promise<Set<string>> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const set = new Set<string>();
  for (const r of rows) {
    set.add(r.blockerId === userId ? r.blockedId : r.blockerId);
  }
  return set;
}

// Prisma `where` fragment that hides any lobby containing a block-set member.
// Pass the viewer's own id so their own parties are never hidden from them.
export function hideBlockedLobbies(
  blockedIds: string[],
  viewerId: string
): Prisma.LobbyWhereInput {
  if (blockedIds.length === 0) return {};
  return {
    OR: [
      { members: { some: { userId: viewerId } } }, // always keep my own parties
      { members: { none: { userId: { in: blockedIds } } } },
    ],
  };
}

// True if this lobby should be hidden from the viewer: it has a block-set
// member and the viewer isn't in it themselves. Used for direct lobby access.
export function isLobbyHiddenFrom(
  members: { userId: string }[],
  blockSet: Set<string>,
  viewerId: string | null
): boolean {
  if (viewerId && members.some((m) => m.userId === viewerId)) return false;
  return members.some((m) => blockSet.has(m.userId));
}

export type RecentTeammate = {
  id: string;
  username: string;
  displayName: string;
  lastPlayedAt: string;
  sharedParties: number;
};

// People the viewer has shared a party with, most recent first. Excludes the
// viewer and anyone in their block-set (blocked users live in their own list;
// people who blocked the viewer are silently omitted).
export async function getRecentTeammates(
  userId: string,
  limit = 24
): Promise<RecentTeammate[]> {
  const myMemberships = await prisma.lobbyMember.findMany({
    where: { userId },
    select: { lobbyId: true },
  });
  const lobbyIds = myMemberships.map((m) => m.lobbyId);
  if (lobbyIds.length === 0) return [];

  const blockSet = await getBlockSet(userId);
  const coMembers = await prisma.lobbyMember.findMany({
    where: { lobbyId: { in: lobbyIds }, userId: { not: userId } },
    include: { user: true },
    orderBy: { joinedAt: "desc" },
  });

  const byUser = new Map<string, RecentTeammate>();
  for (const m of coMembers) {
    if (blockSet.has(m.userId)) continue;
    const existing = byUser.get(m.userId);
    if (existing) {
      existing.sharedParties += 1;
    } else {
      byUser.set(m.userId, {
        id: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        lastPlayedAt: m.joinedAt.toISOString(),
        sharedParties: 1,
      });
    }
  }
  return [...byUser.values()]
    .sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt))
    .slice(0, limit);
}

// Users the viewer has actively blocked (outgoing only), for their block list.
export async function getMyBlocks(userId: string) {
  const rows = await prisma.block.findMany({
    where: { blockerId: userId },
    include: { blocked: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.blocked.id,
    username: r.blocked.username,
    displayName: r.blocked.displayName,
    blockedAt: r.createdAt.toISOString(),
  }));
}
