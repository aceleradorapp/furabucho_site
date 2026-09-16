import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { upload } from '../lib/upload';
import { prisma } from '../lib/prisma';
import { AuthedRequest, PioneiroRequest, requireAuth, requirePermission, requirePioneiroAuth } from '../middleware/auth';

export const pioneirosRouter = Router();

const SIGNUP_POINTS = 10;
const AVATAR_POINTS = 30;
const PHOTO_POINTS = 1.5;
const COMMENT_POINTS = 3;
const VISIT_POINTS = 2;

type PioneiroRecord = {
  id: number;
  name: string;
  avatarUrl: string | null;
  points: number;
  status: string;
};

function serializePioneiro(pioneiro: PioneiroRecord) {
  return {
    id: pioneiro.id,
    name: pioneiro.name,
    avatarUrl: pioneiro.avatarUrl,
    points: pioneiro.points,
    status: pioneiro.status,
  };
}

function displayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function signToken(pioneiroId: number) {
  return jwt.sign({ pioneiroId }, process.env.JWT_SECRET as string, { expiresIn: '90d' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

pioneirosRouter.get('/stats', async (_req, res) => {
  const [totalCount, top] = await Promise.all([
    prisma.pioneiro.count(),
    prisma.pioneiro.findMany({ orderBy: { points: 'desc' }, take: 5, select: { id: true, name: true, avatarUrl: true, points: true } }),
  ]);

  res.json({
    totalCount,
    ranking: top.map((p) => ({ id: p.id, name: displayName(p.name), avatarUrl: p.avatarUrl, points: p.points })),
  });
});

pioneirosRouter.post('/signup', async (req, res) => {
  const { name, email, phone, password } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
  };

  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim().toLowerCase() || null;
  const trimmedPhone = phone?.trim() || null;

  if (!trimmedName) return res.status(400).json({ error: 'Informe seu nome completo' });
  if (!trimmedEmail && !trimmedPhone) return res.status(400).json({ error: 'Informe seu e-mail ou telefone' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' });

  const existing = await prisma.pioneiro.findFirst({
    where: {
      OR: [...(trimmedEmail ? [{ email: trimmedEmail }] : []), ...(trimmedPhone ? [{ phone: trimmedPhone }] : [])],
    },
  });

  if (existing) {
    return res.status(409).json({ error: 'Esse e-mail ou telefone já está cadastrado. Faça login.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const pioneiro = await prisma.pioneiro.create({
    data: {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      passwordHash,
      points: SIGNUP_POINTS,
    },
  });

  const token = signToken(pioneiro.id);
  res.status(201).json({ token, pioneiro: serializePioneiro(pioneiro), pointsEarned: SIGNUP_POINTS });
});

pioneirosRouter.post('/login', async (req, res) => {
  const { identifier, password } = req.body as { identifier?: string; password?: string };

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Informe e-mail/telefone e senha' });
  }

  const normalized = identifier.trim().toLowerCase();
  const pioneiro = await prisma.pioneiro.findFirst({
    where: { OR: [{ email: normalized }, { phone: identifier.trim() }] },
  });

  if (!pioneiro || !(await bcrypt.compare(password, pioneiro.passwordHash))) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = signToken(pioneiro.id);
  res.json({ token, pioneiro: serializePioneiro(pioneiro) });
});

pioneirosRouter.get('/me', requirePioneiroAuth, async (req: PioneiroRequest, res) => {
  const pioneiro = await prisma.pioneiro.findUnique({ where: { id: req.pioneiroId } });
  if (!pioneiro) return res.status(404).json({ error: 'Cadastro não encontrado' });
  res.json({ pioneiro: serializePioneiro(pioneiro) });
});

pioneirosRouter.post('/visit', requirePioneiroAuth, async (req: PioneiroRequest, res) => {
  const pioneiro = await prisma.pioneiro.findUnique({ where: { id: req.pioneiroId } });
  if (!pioneiro) return res.status(404).json({ error: 'Cadastro não encontrado' });

  const now = new Date();
  const alreadyToday = pioneiro.lastVisitAt && isSameDay(pioneiro.lastVisitAt, now);

  if (alreadyToday) {
    return res.json({ pioneiro: serializePioneiro(pioneiro), pointsEarned: 0 });
  }

  const updated = await prisma.pioneiro.update({
    where: { id: pioneiro.id },
    data: { points: { increment: VISIT_POINTS }, lastVisitAt: now },
  });

  res.json({ pioneiro: serializePioneiro(updated), pointsEarned: VISIT_POINTS });
});

pioneirosRouter.post('/avatar', requirePioneiroAuth, upload.single('image'), async (req: PioneiroRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem' });

  const pioneiro = await prisma.pioneiro.findUnique({ where: { id: req.pioneiroId } });
  if (!pioneiro) return res.status(404).json({ error: 'Cadastro não encontrado' });

  const firstTime = !pioneiro.avatarUrl;
  const updated = await prisma.pioneiro.update({
    where: { id: pioneiro.id },
    data: {
      avatarUrl: `/uploads/${req.file.filename}`,
      ...(firstTime ? { points: { increment: AVATAR_POINTS } } : {}),
    },
  });

  res.json({ pioneiro: serializePioneiro(updated), pointsEarned: firstTime ? AVATAR_POINTS : 0 });
});

pioneirosRouter.get('/photos', requirePioneiroAuth, async (req: PioneiroRequest, res) => {
  const photos = await prisma.pioneiroPhoto.findMany({
    where: { pioneiroId: req.pioneiroId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(photos);
});

pioneirosRouter.post('/photos', requirePioneiroAuth, upload.array('images', 20), async (req: PioneiroRequest, res) => {
  const { title } = req.body as { title?: string };
  const files = req.files as Express.Multer.File[] | undefined;
  const trimmedTitle = title?.trim();

  if (!trimmedTitle) return res.status(400).json({ error: 'Dê um título pras suas fotos' });
  if (!files || files.length === 0) return res.status(400).json({ error: 'Envie ao menos uma foto' });

  const pointsEarned = files.length * PHOTO_POINTS;

  const results = await prisma.$transaction([
    ...files.map((file) =>
      prisma.pioneiroPhoto.create({
        data: { pioneiroId: req.pioneiroId as number, title: trimmedTitle, imageUrl: `/uploads/${file.filename}` },
      }),
    ),
    prisma.pioneiro.update({ where: { id: req.pioneiroId }, data: { points: { increment: pointsEarned } } }),
  ]);

  const created = results.slice(0, files.length);
  res.status(201).json({ photos: created, pointsEarned });
});

pioneirosRouter.get('/comments', requirePioneiroAuth, async (req: PioneiroRequest, res) => {
  const comments = await prisma.pioneiroComment.findMany({
    where: { pioneiroId: req.pioneiroId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(comments);
});

pioneirosRouter.post('/comments', requirePioneiroAuth, async (req: PioneiroRequest, res) => {
  const { text } = req.body as { text?: string };
  const trimmed = text?.trim();
  if (!trimmed) return res.status(400).json({ error: 'Escreva um comentário' });

  const [comment] = await prisma.$transaction([
    prisma.pioneiroComment.create({ data: { pioneiroId: req.pioneiroId as number, text: trimmed } }),
    prisma.pioneiro.update({ where: { id: req.pioneiroId }, data: { points: { increment: COMMENT_POINTS } } }),
  ]);

  res.status(201).json({ comment, pointsEarned: COMMENT_POINTS });
});

// Prévia pro admin/ajudante: mostra o perfil de quem mais ajudou, sem precisar de cadastro próprio.
pioneirosRouter.get('/preview', requireAuth, requirePermission('gallery.manage'), async (_req: AuthedRequest, res) => {
  const top = await prisma.pioneiro.findFirst({
    orderBy: { points: 'desc' },
    include: {
      photos: { orderBy: { createdAt: 'desc' } },
      comments: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!top) return res.json({ pioneiro: null });

  res.json({
    pioneiro: serializePioneiro(top),
    photos: top.photos,
    comments: top.comments,
    isPreview: true,
  });
});
