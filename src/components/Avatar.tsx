// Every user gets an avatar automatically - no photo upload needed. We turn
// their name into initials, and pick a color deterministically (the same
// name always produces the same color) from a small on-brand palette.

const PALETTE = ["#FF6F00", "#FF8F33", "#4B5563", "#1F2937", "#B45309"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({
  name,
  size = 36,
}: {
  name: string;
  size?: number;
}) {
  const initials = getInitials(name || "?");
  const bg = getColor(name || "?");

  return (
    <div
      className="rounded-full flex items-center justify-center font-body font-semibold text-white shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: size * 0.4,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}
