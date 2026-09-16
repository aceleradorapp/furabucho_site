import { UPLOADS_BASE } from '../lib/config';
import { getRolePatente, PONTA_FIRME_BADGE, VETERANO_BADGE } from '../lib/patentes';

const COLORS = ['#FF5E14', '#8B2CFF', '#0EA5E9', '#16A34A', '#DB2777', '#CA8A04'];

function colorFor(name: string) {
  const sum = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COLORS[sum % COLORS.length];
}

export function Avatar({
  name,
  avatarUrl,
  size = 36,
  role,
  isPontaFirme,
  isVeterano,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  /** Papel do usuário (admin/membro_ajudante/membro) — mostra o anel + selo da patente correspondente */
  role?: string | null;
  isPontaFirme?: boolean;
  isVeterano?: boolean;
}) {
  const patente = role ? getRolePatente(role) : null;
  const showBadges = size >= 20;
  const showRoleBadge = !!patente && showBadges;
  const RoleIcon = patente?.icon;

  const image = avatarUrl ? (
    <img
      src={/^(https?:|blob:|data:)/.test(avatarUrl) ? avatarUrl : `${UPLOADS_BASE}${avatarUrl}`}
      alt={name}
      className="rounded-full object-cover shrink-0"
      style={{
        width: size,
        height: size,
        ...(patente ? { outline: `2px solid ${patente.color}`, outlineOffset: 1 } : {}),
      }}
    />
  ) : (
    <div
      className="rounded-full flex items-center justify-center text-white font-medium shrink-0"
      style={{
        width: size,
        height: size,
        background: colorFor(name),
        fontSize: size * 0.42,
        ...(patente ? { outline: `2px solid ${patente.color}`, outlineOffset: 1 } : {}),
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );

  if (!showBadges || (!showRoleBadge && !isPontaFirme && !isVeterano)) return image;

  const badgeSize = Math.max(11, Math.round(size * 0.32));

  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {image}

      {showRoleBadge && RoleIcon && (
        <span
          className="absolute rounded-full flex items-center justify-center border border-white"
          style={{
            width: badgeSize,
            height: badgeSize,
            right: -3,
            bottom: -3,
            background: patente.color,
          }}
          title={patente.label}
        >
          <RoleIcon size={badgeSize * 0.62} className="text-black/70" strokeWidth={2.5} />
        </span>
      )}

      {isPontaFirme && (
        <span
          className="absolute rounded-full flex items-center justify-center border border-white"
          style={{
            width: badgeSize * 0.9,
            height: badgeSize * 0.9,
            top: -3,
            left: -3,
            background: PONTA_FIRME_BADGE.color,
          }}
          title={PONTA_FIRME_BADGE.label}
        >
          <PONTA_FIRME_BADGE.icon size={badgeSize * 0.58} className="text-white" strokeWidth={2.5} />
        </span>
      )}

      {isVeterano && (
        <span
          className="absolute rounded-full flex items-center justify-center border border-white"
          style={{
            width: badgeSize * 0.9,
            height: badgeSize * 0.9,
            top: -3,
            right: -3,
            background: VETERANO_BADGE.color,
          }}
          title={VETERANO_BADGE.label}
        >
          <VETERANO_BADGE.icon size={badgeSize * 0.58} className="text-white" strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}
