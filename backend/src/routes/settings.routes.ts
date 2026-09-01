import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requirePermission } from '../middleware/auth';
import { upload } from '../lib/upload';

export const settingsRouter = Router();

async function getOrCreateSettings() {
  const existing = await prisma.siteSettings.findFirst();
  if (existing) return existing;
  return prisma.siteSettings.create({ data: {} });
}

settingsRouter.get('/', async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

settingsRouter.put('/', requireAuth, requirePermission('canManageSettings'), async (req, res) => {
  const { siteName, subtitle, foundingYear, heroTitle, aboutText, logoUrl, heroImageUrl } = req.body as {
    siteName?: string;
    subtitle?: string | null;
    foundingYear?: number | null;
    heroTitle?: string | null;
    aboutText?: string | null;
    logoUrl?: string | null;
    heroImageUrl?: string | null;
  };

  const settings = await getOrCreateSettings();
  const updated = await prisma.siteSettings.update({
    where: { id: settings.id },
    data: {
      ...(siteName !== undefined ? { siteName } : {}),
      ...(subtitle !== undefined ? { subtitle } : {}),
      ...(foundingYear !== undefined ? { foundingYear } : {}),
      ...(heroTitle !== undefined ? { heroTitle } : {}),
      ...(aboutText !== undefined ? { aboutText } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(heroImageUrl !== undefined ? { heroImageUrl } : {}),
    },
  });

  res.json(updated);
});

settingsRouter.post(
  '/logo',
  requireAuth,
  requirePermission('canManageSettings'),
  upload.single('image'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem' });
    const settings = await getOrCreateSettings();
    const updated = await prisma.siteSettings.update({
      where: { id: settings.id },
      data: { logoUrl: `/uploads/${req.file.filename}` },
    });
    res.json(updated);
  },
);

settingsRouter.post(
  '/hero-image',
  requireAuth,
  requirePermission('canManageSettings'),
  upload.single('image'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de imagem' });
    const settings = await getOrCreateSettings();
    const updated = await prisma.siteSettings.update({
      where: { id: settings.id },
      data: { heroImageUrl: `/uploads/${req.file.filename}` },
    });
    res.json(updated);
  },
);
