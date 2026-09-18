import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const birthdaysRouter = Router();

birthdaysRouter.use(requireAuth);

birthdaysRouter.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { birthDate: { not: null } },
    select: { id: true, name: true, nickname: true, avatarUrl: true, birthDate: true },
  });

  const list = users.map((u) => {
    const d = u.birthDate as Date;
    return {
      id: u.id,
      name: u.name,
      nickname: u.nickname,
      avatarUrl: u.avatarUrl,
      day: d.getUTCDate(),
      month: d.getUTCMonth() + 1,
    };
  });

  list.sort((a, b) => (a.month !== b.month ? a.month - b.month : a.day - b.day));

  res.json(list);
});
