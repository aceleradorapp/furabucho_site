import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requirePermission } from '../middleware/auth';

export const adminPioneirosRouter = Router();

adminPioneirosRouter.use(requireAuth, requirePermission('gallery.manage'));

adminPioneirosRouter.get('/photos', async (_req, res) => {
  const photos = await prisma.pioneiroPhoto.findMany({
    orderBy: { createdAt: 'desc' },
    include: { pioneiro: { select: { id: true, name: true } } },
  });
  res.json(photos);
});

adminPioneirosRouter.delete('/photos/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.pioneiroPhoto.delete({ where: { id } });
  res.status(204).end();
});

adminPioneirosRouter.post('/photos/send-to-gallery', async (req, res) => {
  const { photoIds, galleryId, newGallery } = req.body as {
    photoIds?: number[];
    galleryId?: number;
    newGallery?: { title?: string; year?: number };
  };

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos uma foto' });
  }

  let targetGalleryId = galleryId;
  if (!targetGalleryId) {
    if (!newGallery?.title || !newGallery.year) {
      return res.status(400).json({ error: 'Informe o álbum de destino ou título e ano pra criar um novo' });
    }
    const created = await prisma.gallery.create({ data: { title: newGallery.title, year: Number(newGallery.year) } });
    targetGalleryId = created.id;
  }

  const photos = await prisma.pioneiroPhoto.findMany({ where: { id: { in: photoIds }, sentAt: null } });
  if (photos.length === 0) {
    return res.status(400).json({ error: 'Essas fotos já foram enviadas antes' });
  }

  const now = new Date();
  await prisma.$transaction([
    ...photos.map((p) =>
      prisma.galleryImage.create({ data: { galleryId: targetGalleryId as number, imageUrl: p.imageUrl } }),
    ),
    prisma.pioneiroPhoto.updateMany({ where: { id: { in: photos.map((p) => p.id) } }, data: { sentAt: now } }),
  ]);

  res.json({ ok: true, galleryId: targetGalleryId, count: photos.length });
});

adminPioneirosRouter.get('/comments', async (_req, res) => {
  const comments = await prisma.pioneiroComment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { pioneiro: { select: { id: true, name: true } } },
  });
  res.json(comments);
});

adminPioneirosRouter.delete('/comments/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.pioneiroComment.delete({ where: { id } });
  res.status(204).end();
});
