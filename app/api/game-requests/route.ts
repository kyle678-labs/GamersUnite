import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { postGameRequestToChannel } from "@/lib/discord";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const gameName = String(body?.gameName ?? "").trim().slice(0, 100);
  const note = String(body?.note ?? "").trim().slice(0, 500) || null;

  if (gameName.length < 2) {
    return NextResponse.json({ error: "Tell us which game you'd like to see." }, { status: 400 });
  }

  // Fire-and-forget the Discord alert — never block the requester on Discord.
  void postGameRequestToChannel({
    requesterName: user.displayName,
    gameName,
    note,
  });

  return NextResponse.json({ ok: true });
}
