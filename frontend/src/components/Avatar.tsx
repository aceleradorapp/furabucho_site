import { UPLOADS_BASE } from '../lib/config';

const COLORS = ['#FF5E14', '#8B2CFF', '#0EA5E9', '#16A34A', '#DB2777', '#CA8A04'];

function colorFor(name: string) {
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COLORS[sum % COLORS.length];
}

export function Avatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={/^(https?:|blob:|data:)/.test(avatarUrl) ? avatarUrl : `${UPLOADS_BASE}${avatarUrl}`}
        alt={name}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-medium shrink-0"
      style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.42 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
