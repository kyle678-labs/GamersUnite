export default function BannedPage() {
  return (
    <div className="mx-auto max-w-md pt-10 text-center">
      <div className="text-6xl">⛔</div>
      <h1 className="mt-3 text-3xl font-extrabold text-purple-950/80 dark:text-purple-50">
        This account is banned
      </h1>
      <p className="mt-3 font-semibold text-purple-900/50 dark:text-purple-200/60">
        A moderator removed this account from GamersUnite for behavior that goes
        against keeping the community fun and friendly.
      </p>
      <p className="mt-2 text-sm font-bold text-purple-300">
        Think this is a mistake? Reach out to the mods on the Discord server.
      </p>
    </div>
  );
}
