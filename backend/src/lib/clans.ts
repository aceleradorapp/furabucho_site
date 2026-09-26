import { prisma } from './prisma';

/**
 * Regras dos clas, longe das rotas.
 *
 * Tudo que define "pode ou nao pode" mora aqui, pra a regra nao ficar espalhada em cinco
 * arquivos e divergir com o tempo.
 */

/** Dias que a pessoa espera, depois de SAIR por vontade propria, pra entrar em outro cla. */
export const CARENCIA_DIAS = 7;

/** Dias que um cla espera pra reconvidar quem ja recusou. Evita insistencia chata. */
export const RECONVITE_DIAS = 7;

/** Abaixo disso o cla existe, mas fica fora do ranking. Cla de uma pessoa nao e disputa. */
export const MINIMO_PARA_RANKING = 3;

export const NOME_MIN = 3;
export const NOME_MAX = 30;

/**
 * Frases prontas de recusa. Nunca texto livre: a pessoa escolhe a piada e vira dona dela,
 * e o mural nao corre risco de receber desaforo escrito na hora da raiva.
 */
export const MOTIVOS_RECUSA = [
  { codigo: 'outra_turma', texto: 'Já tenho compromisso com outra turma' },
  { codigo: 'melhor_cla', texto: 'Meu clã vai ser melhor que o seu' },
  { codigo: 'esposa', texto: 'Preciso consultar minha esposa' },
  { codigo: 'de_graca', texto: 'Não trabalho de graça' },
  { codigo: 'nivel_tecnico', texto: 'Esse clã não tem meu nível técnico' },
  { codigo: 'aposentar', texto: 'Tô pensando em me aposentar' },
  { codigo: 'churrasco', texto: 'Só entro se tiver churrasco toda semana' },
  { codigo: 'desequilibrar', texto: 'Vou ficar de fora pra não desequilibrar' },
  { codigo: 'medico', texto: 'Meu médico proibiu' },
  { codigo: 'ano_que_vem', texto: 'Aceito — mas só ano que vem' },
  // A saida seria e obrigatoria: se toda opcao for piada, quem so quer recusar educadamente
  // e forcado a fazer graca. Isso vira pressao, nao brincadeira.
  { codigo: 'sem_cla', texto: 'Prefiro ficar sem clã por enquanto' },
] as const;

export function textoDaRecusa(codigo: string | null) {
  return MOTIVOS_RECUSA.find((m) => m.codigo === codigo)?.texto ?? 'Recusou o convite';
}

/** Peças da bandeira. O front desenha a partir daqui; o banco guarda só as escolhas. */
export const EMBLEMA = {
  formas: ['escudo', 'escudo-redondo', 'brasao', 'circulo', 'losango', 'bandeira'],
  divisoes: ['inteiro', 'metade', 'quartos', 'faixas', 'chevron'],
  cores: [
    '#FF5E14', '#E11D48', '#F59E0B', '#16A34A', '#0EA5E9',
    '#7C3AED', '#1C1C1F', '#F4F4F5', '#7C2D12', '#065F46',
  ],
  simbolos: [
    'crown', 'anchor', 'beer', 'flame', 'star', 'shield', 'guitar', 'dice-5',
    'trophy', 'zap', 'heart', 'skull', 'swords', 'ship-wheel', 'fish', 'drumstick',
    'coffee', 'car-front', 'bird', 'trees', 'mountain', 'sun', 'moon', 'cloud-lightning',
    'gem', 'key-round', 'bone', 'cat', 'dog', 'rocket', 'bomb', 'wine',
    'pizza', 'music', 'gamepad-2', 'hand-metal', 'sparkles', 'axe', 'tent', 'waves',
  ],
} as const;

export function emblemaValido(e: {
  emblemShape?: string;
  emblemDivision?: string;
  emblemColor1?: string;
  emblemColor2?: string;
  emblemSymbol?: string;
}) {
  if (e.emblemShape && !EMBLEMA.formas.includes(e.emblemShape as never)) return 'Formato inválido';
  if (e.emblemDivision && !EMBLEMA.divisoes.includes(e.emblemDivision as never)) return 'Divisão inválida';
  if (e.emblemColor1 && !EMBLEMA.cores.includes(e.emblemColor1 as never)) return 'Cor inválida';
  if (e.emblemColor2 && !EMBLEMA.cores.includes(e.emblemColor2 as never)) return 'Cor inválida';
  if (e.emblemSymbol && !EMBLEMA.simbolos.includes(e.emblemSymbol as never)) return 'Símbolo inválido';
  return null;
}

/** O cla do usuario, ou null. */
export async function clanDoUsuario(userId: number) {
  const m = await prisma.clanMember.findUnique({
    where: { userId },
    include: { clan: true },
  });
  return m?.clan ?? null;
}

/**
 * Por que a pessoa nao pode entrar num cla agora. Retorna null quando pode.
 * Centralizado porque a mesma pergunta aparece em tres lugares: ao convidar, ao aceitar
 * o convite e ao criar um cla.
 */
export async function impedimentoParaEntrar(userId: number): Promise<string | null> {
  const jaTem = await prisma.clanMember.findUnique({ where: { userId } });
  if (jaTem) return 'Essa pessoa já está em um clã';

  // Carencia so pra quem saiu por vontade propria; quem foi removido nao escolheu sair.
  const limite = new Date(Date.now() - CARENCIA_DIAS * 86_400_000);
  const saidaRecente = await prisma.clanLeave.findFirst({
    where: { userId, kicked: false, leftAt: { gte: limite } },
    orderBy: { leftAt: 'desc' },
  });
  if (saidaRecente) {
    const faltam = Math.ceil((saidaRecente.leftAt.getTime() + CARENCIA_DIAS * 86_400_000 - Date.now()) / 86_400_000);
    return `Saiu de um clã há pouco tempo. Pode entrar em outro em ${faltam} dia${faltam === 1 ? '' : 's'}.`;
  }

  return null;
}

/** Registra no mural. Nunca derruba a acao principal se falhar. */
export async function registrarEvento(
  clanId: number,
  type: string,
  text: string,
  actorId?: number | null,
) {
  try {
    await prisma.clanEvent.create({ data: { clanId, type, text, actorId: actorId ?? null } });
  } catch (err) {
    console.error('Falha ao registrar evento de clã:', err);
  }
}

/** Os clas estao liberados? O admin liga isso quando houver gente suficiente. */
export async function clansLiberados() {
  const s = await prisma.siteSettings.findFirst({ select: { clansEnabled: true } });
  return !!s?.clansEnabled;
}
