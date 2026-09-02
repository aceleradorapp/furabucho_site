import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { upload } from '../lib/upload';

export const announcementsRouter = Router();

announcementsRouter.use(requireAuth);

announcementsRouter.get('/active', async (req: AuthedRequest, res) => {
  const announcements = await prisma.announcement.findMany({
    where: { active: true, scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: 'desc' },
    include: { views: { where: { userId: req.userId } } },
  });

  res.json(
    announcements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      imageUrl: a.imageUrl,
      link: a.link,
      scheduledAt: a.scheduledAt,
      viewed: a.views.length > 0,
    })),
  );
});

announcementsRouter.get('/', requirePermission('announcements.manage'), async (_req, res) => {
  const announcements = await prisma.announcement.findMany({
    orderBy: { scheduledAt: 'desc' },
    include: { author: { select: { id: true, name: true } } },
  });

  res.json(announcements);
});

announcementsRouter.post(
  '/',
  requirePermission('announcements.manage'),
  upload.single('image'),
  async (req: AuthedRequest, res) => {
    if (!req.file) return res.status(400).json({ error: 'Envie uma imagem para a novidade' });
    const { title, description, link, scheduledAt } = req.body as {
      title?: string;
      description?: string;
      link?: string;
      scheduledAt?: string;
    };

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Escreva um título' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        link: link?.trim() || null,
        imageUrl: `/uploads/${req.file.filename}`,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        authorId: req.userId as number,
      },
    });

    res.status(201).json(announcement);
  },
);

announcementsRouter.post('/:id/view', async (req: AuthedRequest, res) => {
  const announcementId = Number(req.params.id);
  const userId = req.userId as number;

  await prisma.announcementView.upsert({
    where: { announcementId_userId: { announcementId, userId } },
    update: {},
    create: { announcementId, userId },
  });

  res.json({ ok: true });
});

announcementsRouter.delete('/:id', requirePermission('announcements.manage'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.announcement.delete({ where: { id } });
  res.status(204).end();
});
