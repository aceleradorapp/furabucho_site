import fs from 'fs/promises';
import path from 'path';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requirePermission } from '../middleware/auth';

export const adminUploadsRouter = Router();

adminUploadsRouter.use(requireAuth, requirePermission('uploads.manage'));

const UPLOADS_DIR = path.join(__dirname, '..', '..', process.env.UPLOADS_DIR ?? 'uploads');

// Arquivos que não vêm de nenhuma linha do banco, mas são usados de propósito pelo site --
// nunca devem aparecer como "não utilizado".
const WHITELIST = new Set(['.gitkeep', 'fura-bucho.apk']);

function basename(url: string | null | undefined): string | null {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1] || null;
}

async function buildUsageMap(): Promise<Map<string, string[]>> {
  const [users, settings, pioneiros, pioneiroPhotos, banners, announcements, posts, galleryImages] =
    await Promise.all([
      prisma.user.findMany({ select: { name: true, nickname: true, avatarUrl: true, caricatureUrl: true } }),
      prisma.siteSettings.findFirst(),
      prisma.pioneiro.findMany({ select: { name: true, avatarUrl: true } }),
      prisma.pioneiroPhoto.findMany({
        select: { title: true, imageUrl: true, pioneiro: { select: { name: true } } },
      }),
      prisma.banner.findMany({ select: { title: true, imageUrl: true } }),
      prisma.announcement.findMany({ select: { title: true, imageUrl: true } }),
      prisma.post.findMany({
        select: { imageUrl: true, author: { select: { name: true, nickname: true } } },
      }),
      prisma.galleryImage.findMany({
        select: { imageUrl: true, gallery: { select: { title: true, year: true } } },
      }),
    ]);

  const usage = new Map<string, string[]>();
  function addUsage(url: string | null | undefined, label: string) {
    const name = basename(url);
    if (!name) return;
    const list = usage.get(name) ?? [];
    list.push(label);
    usage.set(name, list);
  }

  for (const u of users) {
    const who = u.nickname || u.name;
    addUsage(u.avatarUrl, `Foto de perfil de ${who}`);
    addUsage(u.caricatureUrl, `Caricatura de ${who}`);
  }
  if (settings) {
    addUsage(settings.logoUrl, 'Logo do site');
    addUsage(settings.heroImageUrl, 'Imagem de topo (hero) da página inicial');
  }
  for (const p of pioneiros) addUsage(p.avatarUrl, `Foto de perfil do pioneiro ${p.name}`);
  for (const p of pioneiroPhotos) addUsage(p.imageUrl, `Foto "${p.title}" enviada por ${p.pioneiro.name}`);
  for (const b of banners) addUsage(b.imageUrl, `Banner${b.title ? ` "${b.title}"` : ''}`);
  for (const a of announcements) addUsage(a.imageUrl, `Novidade "${a.title}"`);
  for (const p of posts) addUsage(p.imageUrl, `Post de ${p.author.nickname || p.author.name}`);
  for (const g of galleryImages) addUsage(g.imageUrl, `Galeria ${g.gallery.title} (${g.gallery.year})`);

  return usage;
}

adminUploadsRouter.get('/', async (_req, res) => {
  const usage = await buildUsageMap();
  const entries = await fs.readdir(UPLOADS_DIR);

  const files = await Promise.all(
    entries
      .filter((name) => !WHITELIST.has(name))
      .map(async (filename) => {
        const stat = await fs.stat(path.join(UPLOADS_DIR, filename));
        if (!stat.isFile()) return null;
        const usedBy = usage.get(filename) ?? [];
        return {
          filename,
          size: stat.size,
          modifiedAt: stat.mtime,
          inUse: usedBy.length > 0,
          usedBy,
        };
      }),
  );

  const list = files.filter((f): f is NonNullable<typeof f> => f !== null);
  list.sort((a, b) => b.size - a.size);

  res.json({
    files: list,
    totalSize: list.reduce((sum, f) => sum + f.size, 0),
    unusedSize: list.filter((f) => !f.inUse).reduce((sum, f) => sum + f.size, 0),
  });
});

adminUploadsRouter.delete('/:filename', async (req, res) => {
  const { filename } = req.params;

  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return res.status(400).json({ error: 'Nome de arquivo inválido' });
  }
  if (WHITELIST.has(filename)) {
    return res.status(400).json({ error: 'Esse arquivo não pode ser excluído por aqui' });
  }

  // Reconfere se está em uso agora, não confia só no que o cliente viu na hora de listar.
  const usage = await buildUsageMap();
  if (usage.has(filename)) {
    return res.status(409).json({ error: 'Esse arquivo passou a estar em uso e não foi excluído' });
  }

  try {
    await fs.unlink(path.join(UPLOADS_DIR, filename));
  } catch {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  res.status(204).end();
});
