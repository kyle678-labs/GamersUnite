// Cover art tile: uses real cover art when available (e.g. from IGDB import),
// otherwise a pastel gradient + emoji placeholder so the catalog never looks broken.
export default function GameTile({
  emoji,
  colorA,
  colorB,
  coverUrl,
  name,
  className = "",
  emojiClassName = "text-4xl",
}: {
  emoji: string;
  colorA: string;
  colorB: string;
  coverUrl?: string | null;
  name?: string;
  className?: string;
  emojiClassName?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${colorA}, ${colorB})` }}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className={emojiClassName} role="img" aria-label={name}>
          {emoji}
        </span>
      )}
    </div>
  );
}
