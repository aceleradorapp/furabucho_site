import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { upload } from '../lib/upload';
import { AuthedRequest, requireAuth, requirePermission } from '../middleware/auth';

export const galleryRouter = Router();

galleryRouter.use(requireAuth);

galleryRouter.get('/', async (req: AuthedRequest, res) => {
  const { title, year } = req.query as { title?: string; year?: string };
  const isManager = req.effectivePermissions?.['gallery.manage'] ?? false;

  const galleries = await prisma.gallery.findMany({
    where: {
      ...(title ? { title: { contains: title } } : {}),
      ...(year ? { year: Number(year) } : {}),
    },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    include: {
      images: {
        where: isManager ? {} : { active: true },
        orderBy: { createdAt: 'asc' },
        select: { imageUrl: true },
      },
    },
  });

  res.json(
    galleries.map((g) => ({
      id: g.id,
      title: g.title,
      year: g.year,
      coverUrl: g.images[0]?.imageUrl ?? null,
      imageCount: g.images.length,
      createdAt: g.createdAt,
    })),
  );
});

galleryRouter.get('/:id', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const isManager = req.effectivePermissions?.['gallery.manage'] ?? false;

  const gallery = await prisma.gallery.findUnique({
    where: { id },
    include: {
      images: {
        where: isManager ? {} : { active: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!gallery) return res.status(404).json({ error: 'Galeria não encontrada' });
  res.json(gallery);
});

galleryRouter.post('/', requirePermission('gallery.manage'), async (req, res) => {
  const { title, year } = req.body as { title?: string; year?: number };
  if (!title || !year) return res.status(400).json({ error: 'Informe título e ano' });

  const gallery = await prisma.gallery.create({ data: { title, year: Number(year) } });
  res.status(201).json(gallery);
});

galleryRouter.patch('/:id', requirePermission('gallery.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const { title, year } = req.body as { title?: string; year?: number };

  const gallery = await prisma.gallery.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(year !== undefined ? { year: Number(year) } : {}),
    },
  });

  res.json(gallery);
});

galleryRouter.delete('/:id', requirePermission('gallery.manage'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.gallery.delete({ where: { id } });
  res.status(204).end();
});

galleryRouter.post(
  '/:id/images',
  requirePermission('gallery.manage'),
  upload.array('images', 20),
  async (req, res) => {
    const galleryId = Number(req.params.id);
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Envie ao menos uma imagem' });
    }

    const created = await prisma.$transaction(
      files.map((file) =>
        prisma.galleryImage.create({
          data: { galleryId, imageUrl: `/uploads/${file.filename}` },
        }),
      ),
    );

    res.status(201).json(created);
  },
);

galleryRouter.patch('/:galleryId/images/:imageId', requirePermission('gallery.manage'), async (req, res) => {
  const imageId = Number(req.params.imageId);
  const { active } = req.body as { active?: boolean };

  const image = await prisma.galleryImage.update({
    where: { id: imageId },
    data: { ...(active !== undefined ? { active } : {}) },
  });

  res.json(image);
});

galleryRouter.delete('/:galleryId/images/:imageId', requirePermission('gallery.manage'), async (req, res) => {
  const imageId = Number(req.params.imageId);
  await prisma.galleryImage.delete({ where: { id: imageId } });
  res.status(204).end();
});
