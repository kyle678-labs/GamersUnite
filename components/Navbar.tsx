import Link from "next/link";
import { getUser } from "@/lib/auth";
import { isModerator } from "@/lib/moderation";
import AvatarBubble from "./AvatarBubble";
import ThemeToggle from "./ThemeToggle";

export default async function Navbar() {
  const user = await getUser();
  const mod = isModerator(user);
  return (
    <header className="sticky top-0 z-40 border-b-2 border-white/60 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-[#181226]/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-3xl">🫧</span>
          <span className="font-display bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-2xl font-extrabold text-transparent">
            GamersUnite
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/games"
            className="rounded-full px-3 py-2 font-bold text-purple-900/70 transition hover:bg-purple-100 sm:px-4 dark:text-purple-200/80 dark:hover:bg-white/10"
          >
            🎮 Games
          </Link>
          <Link
            href="/lobbies"
            className="rounded-full px-3 py-2 font-bold text-purple-900/70 transition hover:bg-purple-100 sm:px-4 dark:text-purple-200/80 dark:hover:bg-white/10"
          >
            🔍 Find a party
          </Link>
          {mod && (
            <Link
              href="/moderator"
              className="rounded-full px-3 py-2 font-bold text-purple-900/70 transition hover:bg-purple-100 sm:px-4 dark:text-purple-200/80 dark:hover:bg-white/10"
              title="Moderator console"
            >
              🛡️
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <Link href="/profile" className="ml-1 flex items-center gap-2 rounded-full p-1 transition hover:bg-purple-100 dark:hover:bg-white/10 sm:pr-3">
              <AvatarBubble username={user.username} size="sm" />
              <span className="hidden font-bold text-purple-900/80 dark:text-purple-100 sm:inline">
                {user.displayName}
              </span>
            </Link>
          ) : (
            <Link href="/login" className="btn-primary !px-4 !py-2 text-sm">
              Log in ✨
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
