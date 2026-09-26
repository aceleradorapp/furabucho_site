import { Router } from 'express';
import {
  CARENCIA_DIAS,
  EMBLEMA,
  MINIMO_PARA_RANKING,
  MOTIVOS_RECUSA,
  NOME_MAX,
  NOME_MIN,
  RECONVITE_DIAS,
  clanDoUsuario,
  clansLiberados,
  emblemaValido,
  impedimentoParaEntrar,
  registrarEvento,
  textoDaRecusa,
} from '../lib/clans';
import { PATENTES, PONTOS, pontuacaoDeVarios, pontuacaoDoCla } from '../lib/clanScore';
import { nomeExibicao, notificar } from '../lib/notifications';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth } from '../middleware/auth';

export const clansRouter = Router();

clansRouter.use(requireAuth);

const PESSOA = { id: true, name: true, nickname: true, caricatureUrl: true } as const;

/**
 * Enquanto o admin nao liberar, a area inteira responde 404 -- e nao 403. Assim nem se
 * descobre que ela existe antes da hora, que e o ponto de "liberar como novidade".
 * O admin passa, pra conseguir preparar e conferir antes de abrir.
 */
async function exigirLiberado(req: AuthedRequest, res: import('express').Response, next: import('express').NextFunction) {
  if (req.userRoleKey === 'admin' || (await clansLiberados())) return next();
  return res.status(404).json({ error: 'Não encontrado' });
}

clansRouter.use(exigirLiberado);

/** Peças da bandeira e frases de recusa — o front monta as telas a partir daqui. */
clansRouter.get('/opcoes', (_req, res) => {
  res.json({ emblema: EMBLEMA, motivosRecusa: MOTIVOS_RECUSA, nomeMin: NOME_MIN, nomeMax: NOME_MAX });
});

/**
 * Gente que pode ser convidada. Só nome e caricatura: o membro comum não enxerga e-mail,
 * WhatsApp nem papel de ninguém.
 */
clansRouter.get('/pessoas', async (req: AuthedRequest, res) => {
  const pessoas = await prisma.user.findMany({
    where: { id: { not: req.userId } },
    select: { ...PESSOA, clanMembro: { select: { clanId: true } } },
    orderBy: { name: 'asc' },
  });

  res.json(
    pessoas.map((p) => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      caricatureUrl: p.caricatureUrl,
      // Quem já tem clã aparece na lista, mas marcado — senão a pessoa tenta convidar e leva
      // um "não pode" sem entender por quê.
      jaTemCla: !!p.clanMembro,
      // Sem caricatura a pessoa entra, mas fica inativa. A tela avisa antes.
      semCaricatura: !p.caricatureUrl,
    })),
  );
});

/**
 * Lista de todos os clãs, com pontuação.
 *
 * `ordem=ranking` usa o FÔLEGO (últimos 30 dias) — é a competição de agora, e é por isso
 * que um clã grande e parado não fica em cima só por ser antigo.
 * `ordem=patente` usa a REPUTAÇÃO acumulada — é a história.
 */
clansRouter.get('/', async (req, res) => {
  const clas = await prisma.clan.findMany({
    where: { archivedAt: null },
    include: {
      leader: { select: PESSOA },
      members: { include: { user: { select: PESSOA } }, orderBy: { joinedAt: 'asc' } },
    },
  });

  const pontos = await pontuacaoDeVarios(clas.map((c) => c.id));
  const lista = clas.map((c) => ({ ...serializar(c), pontuacao: pontos.get(c.id) }));

  const ordem = req.query.ordem === 'patente' ? 'patente' : req.query.ordem === 'ranking' ? 'ranking' : 'novos';
  if (ordem === 'ranking') {
    // Fora do ranking (menos de 3 ativos) vai pro fim, sem sumir da lista.
    lista.sort((a, b) => {
      if (a.noRanking !== b.noRanking) return a.noRanking ? -1 : 1;
      return (b.pontuacao?.folego ?? 0) - (a.pontuacao?.folego ?? 0);
    });
  } else if (ordem === 'patente') {
    lista.sort((a, b) => (b.pontuacao?.reputacao ?? 0) - (a.pontuacao?.reputacao ?? 0));
  } else {
    lista.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  res.json(lista);
});

/** A tabela de patentes, pra tela poder mostrar a escada inteira. */
clansRouter.get('/patentes', (_req, res) => {
  res.json({ patentes: PATENTES, pontos: PONTOS, minimoParaRanking: MINIMO_PARA_RANKING });
});

/** O mural: últimas movimentações de todos os clãs. É a aba inicial da página. */
clansRouter.get('/mural', async (_req, res) => {
  const eventos = await prisma.clanEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: {
      clan: { select: { id: true, name: true, emblemShape: true, emblemDivision: true, emblemColor1: true, emblemColor2: true, emblemSymbol: true } },
      actor: { select: PESSOA },
    },
  });
  res.json(eventos);
});

/** Meu clã e meus convites pendentes — o que a tela precisa saber sobre mim. */
clansRouter.get('/meu', async (req: AuthedRequest, res) => {
  const [membro, convites, impedimento] = await Promise.all([
    prisma.clanMember.findUnique({
      where: { userId: req.userId },
      include: {
        clan: {
          include: {
            leader: { select: PESSOA },
            members: { include: { user: { select: PESSOA } }, orderBy: { joinedAt: 'asc' } },
          },
        },
      },
    }),
    prisma.clanInvite.findMany({
      where: { userId: req.userId, status: 'pendente' },
      include: {
        clan: { select: { id: true, name: true, emblemShape: true, emblemDivision: true, emblemColor1: true, emblemColor2: true, emblemSymbol: true } },
        invitedBy: { select: PESSOA },
      },
      orderBy: { createdAt: 'desc' },
    }),
    impedimentoParaEntrar(req.userId as number),
  ]);

  const eu = await prisma.user.findUnique({ where: { id: req.userId }, select: { caricatureUrl: true } });

  res.json({
    cla: membro ? { ...serializar(membro.clan), pontuacao: await pontuacaoDoCla(membro.clanId) } : null,
    souLider: membro ? membro.clan.leaderId === req.userId : false,
    convites,
    impedimento,
    temCaricatura: !!eu?.caricatureUrl,
  });
});

clansRouter.get('/:id', async (req, res) => {
  const cla = await prisma.clan.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      leader: { select: PESSOA },
      members: { include: { user: { select: PESSOA } }, orderBy: { joinedAt: 'asc' } },
    },
  });
  if (!cla || cla.archivedAt) return res.status(404).json({ error: 'Clã não encontrado' });

  const [eventos, pontuacao] = await Promise.all([
    prisma.clanEvent.findMany({
      where: { clanId: cla.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { actor: { select: PESSOA } },
    }),
    pontuacaoDoCla(cla.id),
  ]);

  res.json({ ...serializar(cla), eventos, pontuacao });
});

clansRouter.post('/', async (req: AuthedRequest, res) => {
  const { name, story, ...emblema } = req.body as Record<string, string | undefined>;

  const nome = name?.trim();
  if (!nome || nome.length < NOME_MIN || nome.length > NOME_MAX) {
    return res.status(400).json({ error: `O nome precisa ter de ${NOME_MIN} a ${NOME_MAX} caracteres` });
  }
  const erroEmblema = emblemaValido(emblema);
  if (erroEmblema) return res.status(400).json({ error: erroEmblema });

  const impedimento = await impedimentoParaEntrar(req.userId as number);
  if (impedimento) return res.status(409).json({ error: impedimento });

  const nomeEmUso = await prisma.clan.findFirst({ where: { name: nome, archivedAt: null } });
  if (nomeEmUso) return res.status(409).json({ error: 'Já existe um clã com esse nome' });

  try {
    // Criar o clã e entrar nele é uma coisa só: um clã sem dono nasceria órfão.
    const cla = await prisma.$transaction(async (tx) => {
      const criado = await tx.clan.create({
        data: {
          name: nome,
          story: story?.trim() || null,
          leaderId: req.userId as number,
          ...(emblema.emblemShape ? { emblemShape: emblema.emblemShape } : {}),
          ...(emblema.emblemDivision ? { emblemDivision: emblema.emblemDivision } : {}),
          ...(emblema.emblemColor1 ? { emblemColor1: emblema.emblemColor1 } : {}),
          ...(emblema.emblemColor2 ? { emblemColor2: emblema.emblemColor2 } : {}),
          ...(emblema.emblemSymbol ? { emblemSymbol: emblema.emblemSymbol } : {}),
        },
      });
      await tx.clanMember.create({ data: { clanId: criado.id, userId: req.userId as number } });
      return criado;
    });

    const eu = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, nickname: true } });
    await registrarEvento(cla.id, 'criado', `${nomeExibicao(eu!)} fundou o clã ${cla.name}`, req.userId);

    res.status(201).json(cla);
  } catch {
    return res.status(409).json({ error: 'Não foi possível criar o clã' });
  }
});

/** Só o líder edita nome, história e bandeira. */
clansRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const cla = await prisma.clan.findUnique({ where: { id } });
  if (!cla || cla.archivedAt) return res.status(404).json({ error: 'Clã não encontrado' });
  if (cla.leaderId !== req.userId) return res.status(403).json({ error: 'Só o líder do clã pode alterar' });

  const { name, story, ...emblema } = req.body as Record<string, string | undefined>;
  const erroEmblema = emblemaValido(emblema);
  if (erroEmblema) return res.status(400).json({ error: erroEmblema });

  let nome: string | undefined;
  if (name !== undefined) {
    nome = name.trim();
    if (nome.length < NOME_MIN || nome.length > NOME_MAX) {
      return res.status(400).json({ error: `O nome precisa ter de ${NOME_MIN} a ${NOME_MAX} caracteres` });
    }
    const emUso = await prisma.clan.findFirst({ where: { name: nome, archivedAt: null, id: { not: id } } });
    if (emUso) return res.status(409).json({ error: 'Já existe um clã com esse nome' });
  }

  const atualizado = await prisma.clan.update({
    where: { id },
    data: {
      ...(nome !== undefined ? { name: nome } : {}),
      // Mexer na história tira o bloqueio: é um texto novo, merece avaliação nova.
      ...(story !== undefined ? { story: story.trim() || null, storyBlocked: false } : {}),
      ...Object.fromEntries(Object.entries(emblema).filter(([, v]) => v !== undefined)),
    },
  });

  if (story !== undefined) {
    const eu = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, nickname: true } });
    await registrarEvento(id, 'historia', `${nomeExibicao(eu!)} contou uma nova história do clã`, req.userId);
  }

  res.json(atualizado);
});

clansRouter.post('/:id/convidar', async (req: AuthedRequest, res) => {
  const clanId = Number(req.params.id);
  const { userId } = req.body as { userId?: number };
  if (!userId) return res.status(400).json({ error: 'Informe quem você quer convidar' });

  const cla = await prisma.clan.findUnique({ where: { id: clanId } });
  if (!cla || cla.archivedAt) return res.status(404).json({ error: 'Clã não encontrado' });
  if (cla.leaderId !== req.userId) return res.status(403).json({ error: 'Só o líder do clã pode convidar' });
  if (userId === req.userId) return res.status(400).json({ error: 'Você já está no clã' });

  const impedimento = await impedimentoParaEntrar(userId);
  if (impedimento) return res.status(409).json({ error: impedimento });

  const pendente = await prisma.clanInvite.findFirst({ where: { clanId, userId, status: 'pendente' } });
  if (pendente) return res.status(409).json({ error: 'Essa pessoa já tem um convite seu esperando resposta' });

  // Insistir em quem já disse não é a forma mais rápida de azedar a brincadeira.
  const limite = new Date(Date.now() - RECONVITE_DIAS * 86_400_000);
  const recusouAgora = await prisma.clanInvite.findFirst({
    where: { clanId, userId, status: 'recusado', respondedAt: { gte: limite } },
  });
  if (recusouAgora) {
    return res.status(429).json({ error: `Essa pessoa recusou há pouco. Você pode chamar de novo em alguns dias.` });
  }

  await prisma.clanInvite.create({ data: { clanId, userId, invitedById: req.userId as number } });

  const eu = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, nickname: true } });
  await notificar({
    userId,
    actorId: req.userId,
    type: 'cla_convite',
    message: `${nomeExibicao(eu!)} te chamou pro clã ${cla.name}`,
    link: '/clas',
  });

  // De propósito: o convite NÃO vai pro mural. Só a resposta vai. Publicar o convite põe
  // a pessoa sob pressão pública antes mesmo dela responder.
  res.status(201).json({ ok: true });
});

clansRouter.post('/convites/:id/aceitar', async (req: AuthedRequest, res) => {
  const convite = await prisma.clanInvite.findUnique({
    where: { id: Number(req.params.id) },
    include: { clan: true },
  });
  if (!convite || convite.userId !== req.userId) return res.status(404).json({ error: 'Convite não encontrado' });
  if (convite.status !== 'pendente') return res.status(409).json({ error: 'Esse convite já foi respondido' });
  if (convite.clan.archivedAt) return res.status(409).json({ error: 'Esse clã não existe mais' });

  const impedimento = await impedimentoParaEntrar(req.userId as number);
  if (impedimento) return res.status(409).json({ error: impedimento });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.clanMember.create({ data: { clanId: convite.clanId, userId: req.userId as number } });
      await tx.clanInvite.update({
        where: { id: convite.id },
        data: { status: 'aceito', respondedAt: new Date() },
      });
      // Entrou num clã: os outros convites dele perdem o sentido.
      await tx.clanInvite.updateMany({
        where: { userId: req.userId, status: 'pendente' },
        data: { status: 'cancelado', respondedAt: new Date() },
      });
    });
  } catch {
    return res.status(409).json({ error: 'Não foi possível entrar no clã' });
  }

  const eu = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, nickname: true } });
  await registrarEvento(convite.clanId, 'entrou', `${nomeExibicao(eu!)} entrou no clã`, req.userId);
  await notificar({
    userId: convite.invitedById,
    actorId: req.userId,
    type: 'cla_aceito',
    message: `${nomeExibicao(eu!)} aceitou entrar no clã ${convite.clan.name}`,
    link: '/clas',
  });

  res.json({ ok: true });
});

clansRouter.post('/convites/:id/recusar', async (req: AuthedRequest, res) => {
  const { codigo } = req.body as { codigo?: string };
  if (!codigo || !MOTIVOS_RECUSA.some((m) => m.codigo === codigo)) {
    return res.status(400).json({ error: 'Escolha um motivo da lista' });
  }

  const convite = await prisma.clanInvite.findUnique({
    where: { id: Number(req.params.id) },
    include: { clan: true },
  });
  if (!convite || convite.userId !== req.userId) return res.status(404).json({ error: 'Convite não encontrado' });
  if (convite.status !== 'pendente') return res.status(409).json({ error: 'Esse convite já foi respondido' });

  await prisma.clanInvite.update({
    where: { id: convite.id },
    data: { status: 'recusado', refusalCode: codigo, respondedAt: new Date() },
  });

  const eu = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, nickname: true } });
  // No mural não aparece QUEM convidou: levar um "não" já basta, sem plateia apontando.
  await registrarEvento(
    convite.clanId,
    'recusou',
    `${nomeExibicao(eu!)} recusou o convite: "${textoDaRecusa(codigo)}"`,
    req.userId,
  );

  res.json({ ok: true });
});

/** Sair por conta própria. Cumpre carência — a pessoa escolheu sair. */
clansRouter.post('/sair', async (req: AuthedRequest, res) => {
  const membro = await prisma.clanMember.findUnique({ where: { userId: req.userId }, include: { clan: true } });
  if (!membro) return res.status(404).json({ error: 'Você não está em nenhum clã' });

  const eu = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, nickname: true } });

  await prisma.$transaction(async (tx) => {
    await tx.clanMember.delete({ where: { id: membro.id } });
    await tx.clanLeave.create({ data: { userId: req.userId as number, clanId: membro.clanId, kicked: false } });
    // Líder saindo deixa o clã sem dono; qualquer membro pode assumir depois.
    if (membro.clan.leaderId === req.userId) {
      await tx.clan.update({ where: { id: membro.clanId }, data: { leaderId: null } });
    }
    // Clã que ficou sem ninguém é arquivado: não há quem lidere nem quem assuma.
    const restantes = await tx.clanMember.count({ where: { clanId: membro.clanId } });
    if (restantes === 0) {
      await tx.clan.update({ where: { id: membro.clanId }, data: { archivedAt: new Date() } });
    }
  });

  await registrarEvento(membro.clanId, 'saiu', `${nomeExibicao(eu!)} saiu do clã`, req.userId);
  res.json({ ok: true, carenciaDias: CARENCIA_DIAS });
});

/** O líder remove alguém. Quem foi removido NÃO cumpre carência — não escolheu sair. */
clansRouter.post('/:id/remover', async (req: AuthedRequest, res) => {
  const clanId = Number(req.params.id);
  const { userId } = req.body as { userId?: number };

  const cla = await prisma.clan.findUnique({ where: { id: clanId } });
  if (!cla || cla.archivedAt) return res.status(404).json({ error: 'Clã não encontrado' });
  if (cla.leaderId !== req.userId) return res.status(403).json({ error: 'Só o líder do clã pode remover' });
  if (userId === req.userId) return res.status(400).json({ error: 'Para sair do próprio clã, use "sair"' });

  const membro = await prisma.clanMember.findFirst({ where: { clanId, userId } });
  if (!membro) return res.status(404).json({ error: 'Essa pessoa não está no clã' });

  const alvo = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true } });

  await prisma.$transaction(async (tx) => {
    await tx.clanMember.delete({ where: { id: membro.id } });
    await tx.clanLeave.create({ data: { userId: userId as number, clanId, kicked: true } });
  });

  await registrarEvento(clanId, 'removido', `${nomeExibicao(alvo!)} não faz mais parte do clã`, req.userId);
  await notificar({
    userId: userId as number,
    actorId: req.userId,
    type: 'cla_removido',
    message: `Você saiu do clã ${cla.name}`,
    link: '/clas',
  });

  res.json({ ok: true });
});

/** Clã sem dono: o primeiro membro que clicar assume. */
clansRouter.post('/:id/assumir', async (req: AuthedRequest, res) => {
  const clanId = Number(req.params.id);
  const cla = await prisma.clan.findUnique({ where: { id: clanId } });
  if (!cla || cla.archivedAt) return res.status(404).json({ error: 'Clã não encontrado' });
  if (cla.leaderId !== null) return res.status(409).json({ error: 'Esse clã já tem um líder' });

  const membro = await prisma.clanMember.findFirst({ where: { clanId, userId: req.userId } });
  if (!membro) return res.status(403).json({ error: 'Só quem é do clã pode assumir' });

  // updateMany com leaderId null na condição: se dois clicarem junto, só o primeiro pega.
  const r = await prisma.clan.updateMany({
    where: { id: clanId, leaderId: null },
    data: { leaderId: req.userId as number },
  });
  if (r.count === 0) return res.status(409).json({ error: 'Alguém assumiu antes de você' });

  const eu = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, nickname: true } });
  await registrarEvento(clanId, 'lideranca', `${nomeExibicao(eu!)} assumiu a liderança do clã`, req.userId);

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Ações de quem administra
// ---------------------------------------------------------------------------

function ehAdmin(req: AuthedRequest) {
  return req.userRoleKey === 'admin';
}

/**
 * Tira (ou devolve) a história do clã. A história não passa por aprovação prévia — vai no ar
 * na hora. Isto aqui é o remédio pra quando alguém escreve algo ofensivo.
 */
clansRouter.patch('/:id/historia', async (req: AuthedRequest, res) => {
  if (!ehAdmin(req)) return res.status(403).json({ error: 'Só o administrador pode fazer isso' });

  const id = Number(req.params.id);
  const { bloquear } = req.body as { bloquear?: boolean };
  const cla = await prisma.clan.findUnique({ where: { id } });
  if (!cla) return res.status(404).json({ error: 'Clã não encontrado' });

  await prisma.clan.update({ where: { id }, data: { storyBlocked: !!bloquear } });

  // O líder precisa saber, senão ele fica sem entender por que o texto sumiu.
  if (bloquear && cla.leaderId) {
    await notificar({
      userId: cla.leaderId,
      type: 'cla_historia',
      message: `A história do clã ${cla.name} foi retirada do ar. Escreva outra quando quiser.`,
      link: `/clas/${id}`,
    });
  }

  res.json({ ok: true, storyBlocked: !!bloquear });
});

/** Dissolver o clã. Só o administrador, e é sem volta pra quem estava dentro. */
clansRouter.delete('/:id', async (req: AuthedRequest, res) => {
  if (!ehAdmin(req)) return res.status(403).json({ error: 'Só o administrador pode dissolver um clã' });

  const id = Number(req.params.id);
  const cla = await prisma.clan.findUnique({ where: { id }, include: { members: true } });
  if (!cla || cla.archivedAt) return res.status(404).json({ error: 'Clã não encontrado' });

  const membros = cla.members.map((m) => m.userId);

  await prisma.$transaction(async (tx) => {
    // Quem estava no clã sai SEM carência: não foi escolha dele, e seria castigo dobrado
    // ficar 7 dias sem poder entrar em outro por causa de uma decisão do admin.
    await tx.clanLeave.createMany({
      data: membros.map((userId) => ({ userId, clanId: id, kicked: true })),
    });
    await tx.clanMember.deleteMany({ where: { clanId: id } });
    await tx.clanInvite.updateMany({
      where: { clanId: id, status: 'pendente' },
      data: { status: 'cancelado', respondedAt: new Date() },
    });
    await tx.clan.update({ where: { id }, data: { archivedAt: new Date(), leaderId: null } });
  });

  await Promise.all(
    membros.map((userId) =>
      notificar({ userId, type: 'cla_dissolvido', message: `O clã ${cla.name} foi dissolvido.`, link: '/clas' }),
    ),
  );

  res.json({ ok: true, membrosLiberados: membros.length });
});

/**
 * Admin ou ajudante escreve um texto sobre um clã. Vai pro feed (é conteúdo de verdade, não
 * movimentação automática) e também fica no histórico do clã.
 */
clansRouter.post('/:id/publicar', async (req: AuthedRequest, res) => {
  const podePublicar = ehAdmin(req) || !!req.effectivePermissions?.['announcements.manage'];
  if (!podePublicar) return res.status(403).json({ error: 'Você não pode publicar sobre clãs' });

  const id = Number(req.params.id);
  const texto = (req.body as { texto?: string }).texto?.trim();
  if (!texto) return res.status(400).json({ error: 'Escreva alguma coisa' });

  const cla = await prisma.clan.findUnique({ where: { id } });
  if (!cla || cla.archivedAt) return res.status(404).json({ error: 'Clã não encontrado' });

  const post = await prisma.post.create({
    data: {
      authorId: req.userId as number,
      mediaType: 'text',
      caption: `【${cla.name}】 ${texto}`,
    },
  });

  const eu = await prisma.user.findUnique({ where: { id: req.userId }, select: { name: true, nickname: true } });
  await registrarEvento(id, 'admin', `${nomeExibicao(eu!)}: "${texto}"`, req.userId);

  res.status(201).json({ ok: true, postId: post.id });
});

function serializar(cla: {
  id: number;
  name: string;
  story: string | null;
  storyBlocked: boolean;
  emblemShape: string;
  emblemDivision: string;
  emblemColor1: string;
  emblemColor2: string;
  emblemSymbol: string;
  leaderId: number | null;
  createdAt: Date;
  leader?: { id: number; name: string; nickname: string | null; caricatureUrl: string | null } | null;
  members?: { user: { id: number; name: string; nickname: string | null; caricatureUrl: string | null }; joinedAt: Date }[];
}) {
  const membros = cla.members ?? [];
  // "Ativo" = tem caricatura. Sem ela a pessoa entra, mas não conta pro clã.
  const ativos = membros.filter((m) => !!m.user.caricatureUrl);

  return {
    id: cla.id,
    name: cla.name,
    // História bloqueada some da tela em vez de ficar exposta com um aviso em cima.
    story: cla.storyBlocked ? null : cla.story,
    storyBlocked: cla.storyBlocked,
    emblema: {
      shape: cla.emblemShape,
      division: cla.emblemDivision,
      color1: cla.emblemColor1,
      color2: cla.emblemColor2,
      symbol: cla.emblemSymbol,
    },
    leaderId: cla.leaderId,
    semLider: cla.leaderId === null,
    leader: cla.leader ?? null,
    createdAt: cla.createdAt,
    membros: membros.map((m) => ({ ...m.user, joinedAt: m.joinedAt, ativo: !!m.user.caricatureUrl })),
    totalMembros: membros.length,
    totalAtivos: ativos.length,
    noRanking: ativos.length >= MINIMO_PARA_RANKING,
  };
}
