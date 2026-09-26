import { prisma } from './prisma';

/**
 * Pontuação dos clãs.
 *
 * Duas coisas evoluem, de propósito separadas:
 *   REPUTAÇÃO -> patente. Só sobe, nunca se perde. É a história do clã.
 *   FÔLEGO    -> ranking. Últimos 30 dias. Sobe e desce.
 *
 * Assim o clã veterano mantém o posto conquistado, mas não domina o ranking se parar de
 * jogar. É daí que vem o equilíbrio.
 *
 * ===========================================================================
 * TUDO NESTE ARQUIVO É CALIBRAGEM, NÃO LEI. Quando as disputas existirem, a curva vai
 * acelerar e estes números vão precisar de ajuste. Ficam todos juntos aqui de propósito,
 * pra não ter que caçar constante espalhada pelo código.
 * ===========================================================================
 */

export const PONTOS = {
  publicacao: 10,
  comentario: 3,
  curtidaRecebida: 2,
  // Ainda não existem; ficam aqui pra a conta já nascer pronta.
  fotoNoAcervo: 15,
  vitoriaEmDisputa: 25,
};

/** Acima disso, o que a pessoa faz no dia vale 25%. Ninguém carrega o clã sozinho. */
export const TETO_DIARIO_POR_PESSOA = 30;
export const PESO_ACIMA_DO_TETO = 0.25;

/** Divisor mínimo: impede que clã de 1 ou 2 pessoas seja inflado pela divisão pequena. */
export const PISO_DE_MEMBROS = 4;

/** Janela do fôlego (o ranking de agora). */
export const DIAS_DE_FOLEGO = 30;

export const PATENTES = [
  { nivel: 1, nome: 'Panela Nova', minimo: 0 },
  { nivel: 2, nome: 'Turma da Esquina', minimo: 80 },
  { nivel: 3, nome: 'Roda de Bar', minimo: 200 },
  { nivel: 4, nome: 'Comitê do Isopor', minimo: 450 },
  { nivel: 5, nome: 'Sindicato da Picanha', minimo: 950 },
  { nivel: 6, nome: 'Alto Comando do Chopp', minimo: 1900 },
  { nivel: 7, nome: 'Conselho dos Anciãos', minimo: 3600 },
  { nivel: 8, nome: 'Lenda Viva do Fura-Bucho', minimo: 6500 },
] as const;

export function patenteDe(reputacao: number) {
  let atual: { nivel: number; nome: string; minimo: number } = PATENTES[0];
  for (const p of PATENTES) if (reputacao >= p.minimo) atual = p;
  const proxima = PATENTES.find((p) => p.minimo > reputacao) ?? null;
  return {
    nivel: atual.nivel,
    nome: atual.nome,
    proxima: proxima ? { nome: proxima.nome, faltam: Math.ceil(proxima.minimo - reputacao) } : null,
    // Quanto do degrau atual já foi andado — a barrinha da tela.
    progresso: proxima
      ? Math.min(1, (reputacao - atual.minimo) / (proxima.minimo - atual.minimo))
      : 1,
  };
}

/** Quanto vale um dia de uma pessoa, já com o teto aplicado. */
function comTeto(bruto: number) {
  if (bruto <= TETO_DIARIO_POR_PESSOA) return bruto;
  return TETO_DIARIO_POR_PESSOA + (bruto - TETO_DIARIO_POR_PESSOA) * PESO_ACIMA_DO_TETO;
}

/**
 * Multiplicador de participação: quanto mais gente do clã apareceu, mais vale o esforço.
 * É o peso mais importante — o clã ganha mais puxando os quietos pra dentro do que tendo
 * um craque solitário.
 */
export function multiplicadorParticipacao(ativosNoPeriodo: number, totalMembros: number) {
  if (totalMembros === 0) return 0;
  return Math.min(1.2, 0.6 + 0.6 * (ativosNoPeriodo / totalMembros));
}

interface PontosPorPessoaPorDia {
  /** userId -> (dia ISO -> pontos brutos) */
  [userId: number]: Record<string, number>;
}

function diaDe(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Junta tudo que a pessoa fez, por dia. Lê direto das tabelas de origem em vez de manter um
 * saldo paralelo: não dá pra dessincronizar, e apagar uma publicação já desconta sozinho.
 *
 * A contagem de cada pessoa começa no dia em que ELA entrou no clã, não na fundação dele.
 * Senão quem entra hoje chegaria com um caminhão de pontos velhos e daria pra inflar a
 * patente só recrutando gente movimentada.
 */
async function pontosBrutos(entrada: Map<number, Date>): Promise<PontosPorPessoaPorDia> {
  const userIds = [...entrada.keys()];
  if (userIds.length === 0) return {};

  const maisAntiga = new Date(Math.min(...[...entrada.values()].map((d) => d.getTime())));

  const [posts, comentarios, curtidas] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: { in: userIds }, createdAt: { gte: maisAntiga } },
      select: { authorId: true, createdAt: true },
    }),
    prisma.comment.findMany({
      where: { userId: { in: userIds }, createdAt: { gte: maisAntiga } },
      select: { userId: true, createdAt: true },
    }),
    // Curtida RECEBIDA conta pro dono da publicação, não pra quem curtiu.
    prisma.like.findMany({
      where: { post: { authorId: { in: userIds } }, createdAt: { gte: maisAntiga } },
      select: { createdAt: true, post: { select: { authorId: true } } },
    }),
  ]);

  const mapa: PontosPorPessoaPorDia = {};
  const soma = (userId: number, quando: Date, pontos: number) => {
    const desde = entrada.get(userId);
    if (!desde || quando < desde) return; // antes de entrar no clã não conta
    const dia = diaDe(quando);
    mapa[userId] ??= {};
    mapa[userId][dia] = (mapa[userId][dia] ?? 0) + pontos;
  };

  posts.forEach((x) => soma(x.authorId, x.createdAt, PONTOS.publicacao));
  comentarios.forEach((x) => soma(x.userId, x.createdAt, PONTOS.comentario));
  curtidas.forEach((x) => soma(x.post.authorId, x.createdAt, PONTOS.curtidaRecebida));

  return mapa;
}

export interface PontuacaoDoCla {
  reputacao: number;
  folego: number;
  ativosRecentes: number;
  totalMembros: number;
  multiplicador: number;
  patente: ReturnType<typeof patenteDe>;
}

/**
 * Calcula a pontuação de um clã a partir da atividade dos membros ATUAIS.
 *
 * Nota de desenho: quem sai leva a contribuição junto. É a escolha certa aqui — senão o clã
 * acumularia pontos de gente que nem está mais nele, e daria pra inflar a patente entrando
 * e saindo com muita gente.
 */
export async function pontuacaoDoCla(clanId: number): Promise<PontuacaoDoCla> {
  const membros = await prisma.clanMember.findMany({
    where: { clanId },
    select: { userId: true, joinedAt: true, user: { select: { caricatureUrl: true } } },
  });

  // Só quem tem caricatura conta. Sem ela a pessoa está no clã, mas inativa.
  const comCaricatura = membros.filter((m) => m.user.caricatureUrl);
  const ativos = comCaricatura.map((m) => m.userId);
  const total = ativos.length;

  if (total === 0) {
    return { reputacao: 0, folego: 0, ativosRecentes: 0, totalMembros: 0, multiplicador: 0, patente: patenteDe(0) };
  }

  const entrada = new Map(comCaricatura.map((m) => [m.userId, m.joinedAt]));
  const brutos = await pontosBrutos(entrada);
  const inicioFolego = diaDe(new Date(Date.now() - DIAS_DE_FOLEGO * 86_400_000));

  // Soma por dia, aplicando o teto por pessoa antes de juntar.
  const porDia: Record<string, number> = {};
  const diasAtivosPorPessoa: Record<number, Set<string>> = {};

  for (const userId of ativos) {
    for (const [dia, bruto] of Object.entries(brutos[userId] ?? {})) {
      porDia[dia] = (porDia[dia] ?? 0) + comTeto(bruto);
      diasAtivosPorPessoa[userId] ??= new Set();
      diasAtivosPorPessoa[userId].add(dia);
    }
  }

  const divisor = Math.max(total, PISO_DE_MEMBROS);

  // Participação medida na janela do fôlego: quantos membros apareceram nos últimos 30 dias.
  const ativosRecentes = ativos.filter((u) =>
    [...(diasAtivosPorPessoa[u] ?? [])].some((d) => d >= inicioFolego),
  ).length;
  const multiplicador = multiplicadorParticipacao(ativosRecentes, total);

  let reputacao = 0;
  let folego = 0;
  for (const [dia, pontos] of Object.entries(porDia)) {
    const valor = (pontos / divisor) * multiplicador;
    reputacao += valor;
    if (dia >= inicioFolego) folego += valor;
  }

  const arredonda = (n: number) => Math.round(n * 10) / 10;
  return {
    reputacao: arredonda(reputacao),
    folego: arredonda(folego),
    ativosRecentes,
    totalMembros: total,
    multiplicador: Math.round(multiplicador * 100) / 100,
    patente: patenteDe(reputacao),
  };
}

/** Pontuação de vários clãs de uma vez, pra montar o ranking. */
export async function pontuacaoDeVarios(clanIds: number[]) {
  const pares = await Promise.all(clanIds.map(async (id) => [id, await pontuacaoDoCla(id)] as const));
  return new Map(pares);
}
