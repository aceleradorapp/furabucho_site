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

// Público — vitrine de membros na página inicial. Só quem já tem caricatura cadastrada aparece,
// e a lista se atualiza sozinha (sem curadoria manual) sempre que alguém sobe uma.
settingsRouter.get('/members-showcase', async (_req, res) => {
  const members = await prisma.user.findMany({
    where: { caricatureUrl: { not: null } },
    select: { id: true, name: true, nickname: true, caricatureUrl: true },
    orderBy: { name: 'asc' },
  });
  res.json(members);
});

settingsRouter.put('/', requireAuth, requirePermission('settings.edit'), async (req, res) => {
  const { siteName, subtitle, foundingYear, heroTitle, aboutText, logoUrl, heroImageUrl, pioneirosCampaignActive } =
    req.body as {
      siteName?: string;
      subtitle?: string | null;
      foundingYear?: number | null;
      heroTitle?: string | null;
      aboutText?: string | null;
      logoUrl?: string | null;
      heroImageUrl?: string | null;
      pioneirosCampaignActive?: boolean;
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
      ...(pioneirosCampaignActive !== undefined ? { pioneirosCampaignActive } : {}),
    },
  });

  res.json(updated);
});

settingsRouter.post(
  '/logo',
  requireAuth,
  requirePermission('settings.edit'),
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
  requirePermission('settings.edit'),
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
