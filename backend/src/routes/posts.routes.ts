import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { isVideoFile, postUpload } from '../lib/upload';

export const postsRouter = Router();

postsRouter.use(requireAuth);

postsRouter.get('/', async (req: AuthedRequest, res) => {
  const isAdmin = req.userRoleKey === 'admin';

  const posts = await prisma.post.findMany({
    where: isAdmin ? {} : { blocked: false },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, nickname: true, isPontaFirme: true } },
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
      mediaType: p.mediaType,
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

postsRouter.post(
  '/',
  requirePermission('feed.create'),
  postUpload.single('media'),
  async (req: AuthedRequest, res) => {
    const { caption } = req.body as { caption?: string };
    const trimmedCaption = caption?.trim() || null;

    if (!req.file && !trimmedCaption) {
      return res.status(400).json({ error: 'Escreva algo ou anexe uma foto/vídeo' });
    }

    const post = await prisma.post.create({
      data: {
        authorId: req.userId as number,
        mediaType: req.file ? (isVideoFile(req.file.filename) ? 'video' : 'image') : 'text',
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        caption: trimmedCaption,
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true, nickname: true, isPontaFirme: true } } },
    });

    res.status(201).json({
      id: post.id,
      mediaType: post.mediaType,
      imageUrl: post.imageUrl,
      caption: post.caption,
      blocked: post.blocked,
      createdAt: post.createdAt,
      author: post.author,
      likeCount: 0,
      likedByMe: false,
      comments: [],
    });
  },
);

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

postsRouter.patch('/:id/block', requirePermission('feed.moderate'), async (req, res) => {
  const id = Number(req.params.id);
  const { blocked } = req.body as { blocked?: boolean };

  const post = await prisma.post.update({
    where: { id },
    data: { blocked: blocked ?? true },
  });

  res.json(post);
});

postsRouter.delete('/:id', requirePermission('feed.moderate'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.post.delete({ where: { id } });
  res.status(204).end();
});
