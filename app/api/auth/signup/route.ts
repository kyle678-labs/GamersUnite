import { NextResponse } from "next/server";

// Password accounts are retired — sign in with Discord instead.
export async function POST() {
  return NextResponse.json(
    { error: "Accounts are Discord-only now — use “Continue with Discord”." },
    { status: 410 }
  );
}
