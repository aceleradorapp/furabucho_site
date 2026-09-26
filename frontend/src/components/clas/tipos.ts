import type { Emblema } from './ClanEmblem';
import type { Patente } from './ClanPatente';

export interface Pessoa {
  id: number;
  name: string;
  nickname: string | null;
  caricatureUrl: string | null;
}

export interface PessoaConvidavel extends Pessoa {
  jaTemCla: boolean;
  semCaricatura: boolean;
}

export interface Pontuacao {
  reputacao: number;
  folego: number;
  ativosRecentes: number;
  totalMembros: number;
  multiplicador: number;
  patente: Patente;
}

export interface Membro extends Pessoa {
  joinedAt: string;
  ativo: boolean;
}

export interface Cla {
  id: number;
  name: string;
  story: string | null;
  storyBlocked: boolean;
  emblema: Emblema;
  leaderId: number | null;
  semLider: boolean;
  leader: Pessoa | null;
  createdAt: string;
  membros: Membro[];
  totalMembros: number;
  totalAtivos: number;
  noRanking: boolean;
  pontuacao?: Pontuacao;
}

export interface Convite {
  id: number;
  clan: { id: number; name: string } & Record<string, string | number>;
  invitedBy: Pessoa;
  createdAt: string;
}

export interface EventoDoMural {
  id: number;
  type: string;
  text: string;
  createdAt: string;
  actor: Pessoa | null;
  clan?: { id: number; name: string } & Record<string, string | number>;
}

export interface MotivoRecusa {
  codigo: string;
  texto: string;
}

export function nomeDe(p: { name: string; nickname: string | null }) {
  return p.nickname || p.name;
}

/** O emblema vem espalhado em campos soltos em alguns endpoints; junta de novo. */
export function emblemaDe(o: Record<string, unknown>): Emblema {
  return {
    shape: String(o.emblemShape ?? 'escudo'),
    division: String(o.emblemDivision ?? 'inteiro'),
    color1: String(o.emblemColor1 ?? '#FF5E14'),
    color2: String(o.emblemColor2 ?? '#1C1C1F'),
    symbol: String(o.emblemSymbol ?? 'crown'),
  };
}

export function quando(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
