export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const configured = !!process.env.DISCORD_CLIENT_ID;
  const safeNext = next && next.startsWith("/") ? next : null;
  const href = `/api/auth/discord${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`;

  return (
    <div className="mx-auto max-w-md">
      {error === "discord-failed" && (
        <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-center font-bold text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">
          Discord login didn't work — give it another try. 😿
        </p>
      )}
      <div className="text-center">
        <div className="text-6xl">🫧</div>
        <h1 className="mt-2 text-3xl font-extrabold text-purple-950/80 dark:text-purple-50">Ready to party?</h1>
        <p className="mt-2 font-semibold text-purple-900/50 dark:text-purple-200/60">
          GamersUnite runs on Discord accounts — it's how we lock each party's voice
          room so only your teammates can join. 🔐
        </p>
      </div>
      <div className="bubble-card mt-6 p-6 text-center">
        {configured ? (
          <a href={href} className="btn-discord w-full text-lg">
            Continue with Discord
          </a>
        ) : (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
            Discord login isn't configured on this server yet — see the README.
          </p>
        )}
        <p className="mt-4 text-sm font-bold text-purple-300">
          We only read your username and avatar. No messages, no server access, no
          funny business. ✨
        </p>
      </div>
    </div>
  );
}
