import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { isVideoFile, postUpload } from '../lib/upload';
import { nomeExibicao, notificar } from '../lib/notifications';

export const postsRouter = Router();

postsRouter.use(requireAuth);

/** Corta o comentario pra caber no aviso sem virar um textao. */
function trecho(texto: string, max = 60) {
  const limpo = texto.trim();
  return limpo.length > max ? `${limpo.slice(0, max)}...` : limpo;
}

postsRouter.get('/', async (req: AuthedRequest, res) => {
  const isAdmin = req.userRoleKey === 'admin';

  const posts = await prisma.post.findMany({
    where: isAdmin ? {} : { blocked: false },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          nickname: true,
          isPontaFirme: true,
          isVeterano: true,
          role: { select: { key: true } },
        },
      },
      likes: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
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
      author: { ...p.author, role: p.author.role.key },
      likeCount: p.likes.length,
      likedByMe: p.likes.some((l) => l.userId === req.userId),
      likedBy: p.likes.map((l) => l.user),
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

    const role = await prisma.role.findUnique({ where: { key: req.userRoleKey as string }, select: { dailyPostLimit: true } });
    const dailyPostLimit = role?.dailyPostLimit ?? 4;

    if (dailyPostLimit > 0) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const postsToday = await prisma.post.count({
        where: { authorId: req.userId as number, createdAt: { gte: startOfToday } },
      });
      if (postsToday >= dailyPostLimit) {
        return res.status(429).json({
          error: `Você atingiu o limite de ${dailyPostLimit} publicaç${dailyPostLimit === 1 ? 'ão' : 'ões'} por dia. Tente de novo amanhã.`,
        });
      }
    }

    const post = await prisma.post.create({
      data: {
        authorId: req.userId as number,
        mediaType: req.file ? (isVideoFile(req.file.filename) ? 'video' : 'image') : 'text',
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        caption: trimmedCaption,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            nickname: true,
            isPontaFirme: true,
            isVeterano: true,
            role: { select: { key: true } },
          },
        },
      },
    });

    res.status(201).json({
      id: post.id,
      mediaType: post.mediaType,
      imageUrl: post.imageUrl,
      caption: post.caption,
      blocked: post.blocked,
      createdAt: post.createdAt,
      author: { ...post.author, role: post.author.role.key },
      likeCount: 0,
      likedByMe: false,
      likedBy: [],
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

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  const quemCurtiu = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, nickname: true },
  });
  if (post && quemCurtiu) {
    await notificar({
      userId: post.authorId,
      actorId: userId,
      type: 'like',
      message: `${nomeExibicao(quemCurtiu)} curtiu sua publicação`,
      // Leva direto na publicacao, nao no topo do feed -- com o feed cheio, "curtiu sua
      // publicacao" sem endereco obriga a pessoa a cacar qual era.
      link: `/feed#post-${postId}`,
    });
  }

  res.json({ liked: true });
});

postsRouter.post('/:id/comments', async (req: AuthedRequest, res) => {
  const postId = Number(req.params.id);
  const { text } = req.body as { text?: string };
  if (!text) return res.status(400).json({ error: 'Escreva um comentário' });

  const comment = await prisma.comment.create({
    data: { postId, userId: req.userId as number, text },
    include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
  });

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (post) {
    await notificar({
      userId: post.authorId,
      actorId: req.userId,
      type: 'comment',
      message: `${nomeExibicao(comment.user)} comentou na sua publicação: "${trecho(text)}"`,
      link: `/feed#post-${postId}`,
    });
  }

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

// Apagar publicacao: o proprio autor sempre pode apagar a dele; quem modera pode apagar
// qualquer uma. Sem isso, um membro que publicou errado ficava preso com o post pra sempre.
postsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);

  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return res.status(404).json({ error: 'Publicação não encontrada' });

  const isAuthor = post.authorId === req.userId;
  const canModerate = !!req.effectivePermissions?.['feed.moderate'];
  if (!isAuthor && !canModerate) {
    return res.status(403).json({ error: 'Você só pode apagar as suas próprias publicações' });
  }

  await prisma.post.delete({ where: { id } });
  res.status(204).end();
});

// Mesma regra pros comentarios -- antes nao existia jeito nenhum de apagar um comentario,
// nem pro autor nem pro admin.
postsRouter.delete('/comments/:id', async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);

  const comment = await prisma.comment.findUnique({ where: { id }, select: { userId: true } });
  if (!comment) return res.status(404).json({ error: 'Comentário não encontrado' });

  const isAuthor = comment.userId === req.userId;
  const canModerate = !!req.effectivePermissions?.['feed.moderate'];
  if (!isAuthor && !canModerate) {
    return res.status(403).json({ error: 'Você só pode apagar os seus próprios comentários' });
  }

  await prisma.comment.delete({ where: { id } });
  res.status(204).end();
});
