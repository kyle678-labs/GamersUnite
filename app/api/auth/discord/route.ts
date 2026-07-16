import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

// Kicks off "Log in with Discord" — only active when DISCORD_CLIENT_ID is set.
export async function GET(req: Request) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/login?error=discord-not-configured`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("gu_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  // Remember where to send the user after login (e.g. back to a party page).
  const next = new URL(req.url).searchParams.get("next");
  if (next?.startsWith("/")) {
    store.set("gu_oauth_next", next, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: `${appUrl}/api/auth/discord/callback`,
    scope: "identify",
    state,
  });
  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`);
}
