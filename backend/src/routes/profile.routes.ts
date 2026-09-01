import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { upload } from '../lib/upload';
import { AuthedRequest, requireAuth } from '../middleware/auth';

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.patch('/', async (req: AuthedRequest, res) => {
  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Informe um nome' });
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { name: name.trim() },
    include: { role: true },
  });

  res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl });
});

profileRouter.post('/avatar', upload.single('image'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem' });

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { avatarUrl: `/uploads/${req.file.filename}` },
  });

  res.json({ id: user.id, avatarUrl: user.avatarUrl });
});
