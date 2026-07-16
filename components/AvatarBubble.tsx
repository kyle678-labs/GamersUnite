const AVATAR_EMOJI = ["🐸", "🐱", "🦊", "🐼", "🐙", "🦄", "🐧", "🐝", "🐢", "🦉", "🐹", "🦕"];
const AVATAR_BG = [
  "linear-gradient(135deg,#ffd6e8,#ffe9f5)",
  "linear-gradient(135deg,#d6e0ff,#e3f4ff)",
  "linear-gradient(135deg,#d9f2e6,#e9fff4)",
  "linear-gradient(135deg,#fff0cc,#ffe8d6)",
  "linear-gradient(135deg,#e8ddff,#f3edff)",
  "linear-gradient(135deg,#d6f4ff,#e3fbff)",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Deterministic cute avatar from a username — no uploads needed.
export default function AvatarBubble({
  username,
  size = "md",
  title,
}: {
  username: string;
  size?: "sm" | "md" | "lg";
  title?: string;
}) {
  const h = hash(username);
  const emoji = AVATAR_EMOJI[h % AVATAR_EMOJI.length];
  const bg = AVATAR_BG[(h >> 4) % AVATAR_BG.length];
  const cls =
    size === "sm" ? "h-8 w-8 text-base" : size === "lg" ? "h-16 w-16 text-3xl" : "h-11 w-11 text-xl";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${cls}`}
      style={{ background: bg }}
      title={title ?? username}
    >
      <span role="img">{emoji}</span>
    </div>
  );
}
