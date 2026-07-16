import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/social";
import { postReportToModLog } from "@/lib/discord";

const VALID_REASONS = new Set(REPORT_REASONS.map((r) => r.value));
const REASON_LABELS = new Map(REPORT_REASONS.map((r) => [r.value, r.label]));

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const reportedId = String(body?.reportedId ?? "");
  const reason = String(body?.reason ?? "");
  const details = String(body?.details ?? "").trim().slice(0, 1000) || null;
  const lobbyId = body?.lobbyId ? String(body.lobbyId) : null;

  if (reportedId === user.id) {
    return NextResponse.json({ error: "You can't report yourself." }, { status: 400 });
  }
  if (!VALID_REASONS.has(reason as never)) {
    return NextResponse.json({ error: "Pick a reason for the report." }, { status: 400 });
  }
  const target = await prisma.user.findUnique({
    where: { id: reportedId },
    select: { id: true, displayName: true },
  });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await prisma.report.create({
    data: { reporterId: user.id, reportedId, lobbyId, reason, details },
  });

  // Alert the mod-log Discord channel. Fire-and-forget — never block the
  // reporter on Discord being reachable.
  void postReportToModLog({
    reporterName: user.displayName,
    reportedName: target.displayName,
    reportedId: target.id,
    reasonLabel: REASON_LABELS.get(reason as never) ?? reason,
    details,
    lobbyId,
  });

  return NextResponse.json({ ok: true });
}
