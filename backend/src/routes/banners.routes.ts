import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requirePermission } from '../middleware/auth';
import { upload } from '../lib/upload';

export const bannersRouter = Router();

bannersRouter.get('/', async (_req, res) => {
  const banners = await prisma.banner.findMany({ orderBy: { order: 'asc' } });
  res.json(banners);
});

bannersRouter.post(
  '/',
  requireAuth,
  requirePermission('canManageSettings'),
  upload.single('image'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Envie uma imagem de banner' });
    const { title, subtitle, linkUrl, order } = req.body as {
      title?: string;
      subtitle?: string;
      linkUrl?: string;
      order?: string;
    };

    const banner = await prisma.banner.create({
      data: {
        imageUrl: `/uploads/${req.file.filename}`,
        title,
        subtitle,
        linkUrl,
        order: order ? Number(order) : 0,
      },
    });

    res.status(201).json(banner);
  },
);

bannersRouter.patch('/:id', requireAuth, requirePermission('canManageSettings'), async (req, res) => {
  const id = Number(req.params.id);
  const { title, subtitle, linkUrl, order, active } = req.body as {
    title?: string;
    subtitle?: string;
    linkUrl?: string;
    order?: number;
    active?: boolean;
  };

  const banner = await prisma.banner.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(subtitle !== undefined ? { subtitle } : {}),
      ...(linkUrl !== undefined ? { linkUrl } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  res.json(banner);
});

bannersRouter.delete('/:id', requireAuth, requirePermission('canManageSettings'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.banner.delete({ where: { id } });
  res.status(204).end();
});
