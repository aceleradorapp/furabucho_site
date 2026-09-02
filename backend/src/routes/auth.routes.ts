import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { computeEffectivePermissions } from '../lib/permissions';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth } from '../middleware/auth';

export const authRouter = Router();

function serializeUser(user: {
  id: number;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  birthDate: Date | null;
  mustChangePassword: boolean;
  role: {
    key: string;
    label: string;
    permissions: { key: string; value: boolean }[];
  };
  permissionOverrides: { key: string; value: boolean }[];
}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    birthDate: user.birthDate,
    mustChangePassword: user.mustChangePassword,
    role: user.role.key,
    roleLabel: user.role.label,
    permissions: computeEffectivePermissions(user.role.key, user.role.permissions, user.permissionOverrides),
  };
}

const userInclude = { role: { include: { permissions: true } }, permissionOverrides: true } as const;

authRouter.post('/login', async (req, res) => {
  const { identifier, password } = req.body as { identifier?: string; password?: string };

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Informe usuário/e-mail e senha' });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
    include: userInclude,
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

  res.json({ token, user: serializeUser(user) });
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, include: userInclude });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ user: serializeUser(user) });
});

authRouter.post('/change-password', requireAuth, async (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  res.json({ ok: true });
});
