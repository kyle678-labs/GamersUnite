import crypto from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "./db";

const COOKIE_NAME = "gu_session";
const SESSION_DAYS = 30;

export class BannedError extends Error {}

export async function createSession(userId: string) {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true },
  });
  if (target?.bannedAt) throw new BannedError("This account is banned.");

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id: token, userId, expiresAt } });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  });
}

export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.bannedAt) return null; // banned = effectively logged out
  return session.user;
});

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { id: token } });
  }
  store.delete(COOKIE_NAME);
}
