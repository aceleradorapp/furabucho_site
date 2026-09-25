import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { upload } from '../lib/upload';
import { AuthedRequest, requireAuth } from '../middleware/auth';

export const profileRouter = Router();

profileRouter.use(requireAuth);

// Numeros da propria participacao. Nao e vaidade: pra quem entra e ve o app vazio, ver
// "3 publicacoes, 12 curtidas recebidas" e o que mostra que participar tem retorno.
profileRouter.get('/resumo', async (req: AuthedRequest, res) => {
  const meusPosts = await prisma.post.findMany({
    where: { authorId: req.userId },
    select: { id: true },
  });
  const ids = meusPosts.map((p) => p.id);

  const [curtidasRecebidas, comentariosRecebidos, curtidasDadas, comentariosFeitos, usuario] = await Promise.all([
    ids.length ? prisma.like.count({ where: { postId: { in: ids } } }) : 0,
    ids.length ? prisma.comment.count({ where: { postId: { in: ids } } }) : 0,
    prisma.like.count({ where: { userId: req.userId } }),
    prisma.comment.count({ where: { userId: req.userId } }),
    prisma.user.findUnique({ where: { id: req.userId }, select: { createdAt: true, nickname: true } }),
  ]);

  res.json({
    publicacoes: ids.length,
    curtidasRecebidas,
    comentariosRecebidos,
    curtidasDadas,
    comentariosFeitos,
    nickname: usuario?.nickname ?? null,
    membroDesde: usuario?.createdAt ?? null,
  });
});

profileRouter.patch('/', async (req: AuthedRequest, res) => {
  const { name, birthDate } = req.body as { name?: string; birthDate?: string | null };
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Informe um nome' });
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      name: name.trim(),
      ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
    },
    include: { role: true },
  });

  res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, birthDate: user.birthDate });
});

profileRouter.post('/avatar', upload.single('image'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem' });

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { avatarUrl: `/uploads/${req.file.filename}` },
  });

  res.json({ id: user.id, avatarUrl: user.avatarUrl });
});
