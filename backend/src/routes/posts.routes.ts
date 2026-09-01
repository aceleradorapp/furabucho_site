import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAdmin, requireAuth, requirePermission } from '../middleware/auth';
import { upload } from '../lib/upload';

export const postsRouter = Router();

postsRouter.use(requireAuth);

postsRouter.get('/', async (req: AuthedRequest, res) => {
  const isAdmin = req.userRole?.key === 'admin';

  const posts = await prisma.post.findMany({
    where: isAdmin ? {} : { blocked: false },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      likes: true,
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  res.json(
    posts.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      caption: p.caption,
      blocked: p.blocked,
      createdAt: p.createdAt,
      author: p.author,
      likeCount: p.likes.length,
      likedByMe: p.likes.some((l) => l.userId === req.userId),
      comments: p.comments.map((c) => ({ id: c.id, text: c.text, user: c.user, createdAt: c.createdAt })),
    })),
  );
});

postsRouter.post('/', requirePermission('canManagePosts'), upload.single('image'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem para o post' });
  const { caption } = req.body as { caption?: string };

  const post = await prisma.post.create({
    data: {
      authorId: req.userId as number,
      imageUrl: `/uploads/${req.file.filename}`,
      caption,
    },
  });

  res.status(201).json(post);
});

postsRouter.post('/:id/like', async (req: AuthedRequest, res) => {
  const postId = Number(req.params.id);
  const userId = req.userId as number;

  const existing = await prisma.like.findUnique({ where: { postId_userId: { postId, userId } } });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    return res.json({ liked: false });
  }

  await prisma.like.create({ data: { postId, userId } });
  res.json({ liked: true });
});

postsRouter.post('/:id/comments', async (req: AuthedRequest, res) => {
  const postId = Number(req.params.id);
  const { text } = req.body as { text?: string };
  if (!text) return res.status(400).json({ error: 'Escreva um comentário' });

  const comment = await prisma.comment.create({
    data: { postId, userId: req.userId as number, text },
    include: { user: { select: { id: true, name: true } } },
  });

  res.status(201).json(comment);
});

postsRouter.patch('/:id/block', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { blocked } = req.body as { blocked?: boolean };

  const post = await prisma.post.update({
    where: { id },
    data: { blocked: blocked ?? true },
  });

  res.json(post);
});

postsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.post.delete({ where: { id } });
  res.status(204).end();
});
