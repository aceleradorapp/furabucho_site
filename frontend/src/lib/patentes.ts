import { Anchor, Crown, Flame, Medal, Shield, type LucideIcon } from 'lucide-react';

export interface RolePatente {
  label: string;
  color: string;
  icon: LucideIcon;
}

export const ROLE_PATENTES: Record<string, RolePatente> = {
  admin: { label: 'Administrador', color: '#FFD54A', icon: Crown },
  membro_ajudante: { label: 'Guardião', color: '#60A5FA', icon: Shield },
  membro: { label: 'Fura-Bucho', color: '#FF5E14', icon: Flame },
};

export const DEFAULT_PATENTE: RolePatente = ROLE_PATENTES.membro;

export function getRolePatente(role?: string | null): RolePatente {
  if (!role) return DEFAULT_PATENTE;
  return ROLE_PATENTES[role] ?? DEFAULT_PATENTE;
}

export const PONTA_FIRME_BADGE = { label: 'Ponta Firme', color: '#F59E0B', icon: Anchor };
export const VETERANO_BADGE = { label: 'Veterano (mais de 3 encontros)', color: '#A855F7', icon: Medal };
