import type { User } from "@prisma/client";
import { prisma } from "./db";
import { releaseVoiceChannel } from "./matchmaking";
import { removeMemberFromChannel } from "./discord";

// A user is a moderator if their DB flag is set, or their Discord id is in the
// env allowlist (bootstraps the owner without DB surgery).
export function isModerator(user: Pick<User, "isModerator" | "discordId"> | null): boolean {
  if (!user) return false;
  if (user.isModerator) return true;
  const allow = (process.env.MODERATOR_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return !!user.discordId && allow.includes(user.discordId);
}

// Ban a user: block future logins/actions, kill their sessions, tear down
// their active parties, revoke their voice access, and resolve open reports
// against them as "actioned".
export async function banUser(userId: string, reason: string | null, moderatorId: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordId: true },
  });
  if (!target) return;

  await prisma.user.update({
    where: { id: userId },
    data: { bannedAt: new Date(), banReason: reason?.slice(0, 300) || null },
  });
  await prisma.session.deleteMany({ where: { userId } });

  // Close parties they host.
  const hosted = await prisma.lobby.findMany({
    where: { hostId: userId, status: { not: "closed" } },
    select: { id: true },
  });
  for (const l of hosted) {
    await prisma.lobby.update({ where: { id: l.id }, data: { status: "closed" } });
    await releaseVoiceChannel(l.id);
  }

  // Pull them out of parties they merely joined + revoke their voice overwrite.
  const memberships = await prisma.lobbyMember.findMany({
    where: { userId, lobby: { status: { not: "closed" } } },
    include: { lobby: { include: { voiceChannel: true } } },
  });
  for (const m of memberships) {
    await prisma.lobbyMember.deleteMany({ where: { lobbyId: m.lobbyId, userId } });
    const vc = m.lobby.voiceChannel;
    if (vc?.managed && target.discordId) {
      await removeMemberFromChannel(vc.id, target.discordId);
      if (vc.textChannelId) {
        await removeMemberFromChannel(vc.textChannelId, target.discordId);
      }
    }
  }

  await prisma.report.updateMany({
    where: { reportedId: userId, status: "open" },
    data: { status: "actioned", resolvedAt: new Date(), resolvedById: moderatorId },
  });
}

export async function unbanUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { bannedAt: null, banReason: null },
  });
}

export async function markReportReviewed(reportId: string, moderatorId: string) {
  await prisma.report.updateMany({
    where: { id: reportId, status: "open" },
    data: { status: "reviewed", resolvedAt: new Date(), resolvedById: moderatorId },
  });
}
