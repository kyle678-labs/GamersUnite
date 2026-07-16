import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function GET(req: Request) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const savedState = store.get("gu_oauth_state")?.value;
  store.delete("gu_oauth_state");
  const next = store.get("gu_oauth_next")?.value;
  store.delete("gu_oauth_next");

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/login?error=discord-failed`);
  }

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${appUrl}/api/auth/discord/callback`,
      }),
    });
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!meRes.ok) throw new Error(`user fetch failed: ${meRes.status}`);
    const me: { id: string; username: string; global_name?: string } = await meRes.json();

    let user = await prisma.user.findUnique({ where: { discordId: me.id } });
    if (!user) {
      // Pick a free username, appending part of the Discord ID on collision.
      let username = me.username.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20) || "player";
      if (await prisma.user.findUnique({ where: { username } })) {
        username = `${username.slice(0, 14)}_${me.id.slice(-5)}`;
      }
      user = await prisma.user.create({
        data: {
          username,
          displayName: (me.global_name ?? me.username).slice(0, 40),
          discordId: me.id,
        },
      });
    }

    if (user.bannedAt) {
      return NextResponse.redirect(`${appUrl}/banned`);
    }

    await createSession(user.id);
    return NextResponse.redirect(
      next?.startsWith("/") ? `${appUrl}${next}` : appUrl
    );
  } catch (e) {
    console.error("Discord OAuth error:", e);
    return NextResponse.redirect(`${appUrl}/login?error=discord-failed`);
  }
}
