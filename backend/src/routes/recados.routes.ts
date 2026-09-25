import crypto from 'crypto';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { nomeExibicao, notificar } from '../lib/notifications';
import { AuthedRequest, requireAuth } from '../middleware/auth';

export const recadosRouter = Router();

recadosRouter.use(requireAuth);

const TAMANHO_MAXIMO = 500;

function inicioDoDia() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function limiteDiario(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { dailyRecadoLimit: true } } },
  });
  const limite = user?.role.dailyRecadoLimit ?? 0;

  // Cada ENVIO conta 1, mesmo indo pra várias pessoas — por isso contamos batchId distintos.
  const enviosHoje = await prisma.recado.findMany({
    where: { fromUserId: userId, createdAt: { gte: inicioDoDia() } },
    select: { batchId: true },
    distinct: ['batchId'],
  });

  return { limite, usados: enviosHoje.length, restantes: Math.max(0, limite - enviosHoje.length) };
}

/** Lista de gente pra quem dá pra mandar bilhetinho (todo mundo, menos você). */
recadosRouter.get('/destinatarios', async (req: AuthedRequest, res) => {
  const pessoas = await prisma.user.findMany({
    where: { id: { not: req.userId } },
    select: { id: true, name: true, nickname: true, avatarUrl: true },
    orderBy: { name: 'asc' },
  });
  res.json(pessoas);
});

/** Caixa de entrada + quanto ainda dá pra enviar hoje. */
recadosRouter.get('/', async (req: AuthedRequest, res) => {
  const [recebidos, naoLidos, cota] = await Promise.all([
    prisma.recado.findMany({
      where: { toUserId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { fromUser: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
    }),
    prisma.recado.count({ where: { toUserId: req.userId, readAt: null } }),
    limiteDiario(req.userId as number),
  ]);

  res.json({
    naoLidos,
    cota,
    recados: recebidos.map((r) => ({
      id: r.id,
      message: r.message,
      lido: !!r.readAt,
      createdAt: r.createdAt,
      de: r.fromUser,
    })),
  });
});

/** O que eu mandei — agrupado por envio, pra ver "mandei pra 5 pessoas". */
recadosRouter.get('/enviados', async (req: AuthedRequest, res) => {
  const enviados = await prisma.recado.findMany({
    where: { fromUserId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { toUser: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
  });

  const porEnvio = new Map<string, { batchId: string; message: string; createdAt: Date; para: typeof enviados[number]['toUser'][] }>();
  for (const r of enviados) {
    const atual = porEnvio.get(r.batchId);
    if (atual) atual.para.push(r.toUser);
    else porEnvio.set(r.batchId, { batchId: r.batchId, message: r.message, createdAt: r.createdAt, para: [r.toUser] });
  }

  res.json(Array.from(porEnvio.values()));
});

recadosRouter.post('/', async (req: AuthedRequest, res) => {
  const { toUserIds, message } = req.body as { toUserIds?: number[]; message?: string };
  const texto = message?.trim();

  if (!texto) return res.status(400).json({ error: 'Escreva o recado' });
  if (texto.length > TAMANHO_MAXIMO) {
    return res.status(400).json({ error: `O recado pode ter no máximo ${TAMANHO_MAXIMO} caracteres` });
  }

  const destinatarios = Array.from(new Set((toUserIds ?? []).map(Number).filter((id) => id && id !== req.userId)));
  if (destinatarios.length === 0) {
    return res.status(400).json({ error: 'Escolha pelo menos uma pessoa' });
  }

  const cota = await limiteDiario(req.userId as number);
  if (cota.limite === 0) {
    return res.status(403).json({ error: 'Os bilhetinhos estão desativados para o seu perfil' });
  }
  if (cota.restantes <= 0) {
    return res.status(429).json({
      error: `Você já enviou ${cota.limite} bilhetinho${cota.limite === 1 ? '' : 's'} hoje. Tente de novo amanhã.`,
    });
  }

  const existentes = await prisma.user.findMany({
    where: { id: { in: destinatarios } },
    select: { id: true },
  });
  if (existentes.length === 0) return res.status(400).json({ error: 'Nenhum destinatário válido' });

  const batchId = crypto.randomUUID();
  const remetente = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { name: true, nickname: true },
  });

  await prisma.recado.createMany({
    data: existentes.map((d) => ({ fromUserId: req.userId as number, toUserId: d.id, message: texto, batchId })),
  });

  if (remetente) {
    await Promise.all(
      existentes.map((d) =>
        notificar({
          userId: d.id,
          actorId: req.userId,
          type: 'recado',
          message: `${nomeExibicao(remetente)} te mandou um bilhetinho`,
          link: '/bilhetinhos',
        }),
      ),
    );
  }

  const novaCota = await limiteDiario(req.userId as number);
  res.status(201).json({ enviados: existentes.length, cota: novaCota });
});

recadosRouter.post('/:id/read', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const resultado = await prisma.recado.updateMany({
    where: { id, toUserId: req.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true, atualizados: resultado.count });
});

/** Só dá pra apagar bilhetinho que é seu (recebido). */
recadosRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const recado = await prisma.recado.findUnique({ where: { id }, select: { toUserId: true } });
  if (!recado) return res.status(404).json({ error: 'Bilhetinho não encontrado' });
  if (recado.toUserId !== req.userId) {
    return res.status(403).json({ error: 'Você só pode apagar bilhetinhos que recebeu' });
  }

  await prisma.recado.delete({ where: { id } });
  res.status(204).end();
});
