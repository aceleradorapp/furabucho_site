import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth } from '../middleware/auth';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

const LIMITE_LISTA = 30;

notificationsRouter.get('/', async (req: AuthedRequest, res) => {
  const notificacoes = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: LIMITE_LISTA,
    include: { actor: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
  });

  const naoLidas = await prisma.notification.count({
    where: { userId: req.userId, readAt: null },
  });

  res.json({
    naoLidas,
    notificacoes: notificacoes.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      link: n.link,
      lida: !!n.readAt,
      createdAt: n.createdAt,
      actor: n.actor,
    })),
  });
});

notificationsRouter.post('/read-all', async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

notificationsRouter.post('/:id/read', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);

  // Só deixa marcar como lido o que é da própria pessoa.
  const resultado = await prisma.notification.updateMany({
    where: { id, userId: req.userId, readAt: null },
    data: { readAt: new Date() },
  });

  res.json({ ok: true, atualizadas: resultado.count });
});
