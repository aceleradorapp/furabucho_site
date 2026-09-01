import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requirePermission } from '../middleware/auth';

export const usersRouter = Router();

usersRouter.use(requireAuth, requirePermission('canManageUsers'));

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 8) + '1A';
}

usersRouter.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role.key,
      roleLabel: u.role.label,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
    })),
  );
});

usersRouter.get('/roles', async (_req, res) => {
  const roles = await prisma.role.findMany({ select: { id: true, key: true, label: true } });
  res.json(roles);
});

usersRouter.post('/', async (req, res) => {
  const { name, username, email, roleId } = req.body as {
    name?: string;
    username?: string;
    email?: string;
    roleId?: number;
  };

  if (!name || !username || !email || !roleId) {
    return res.status(400).json({ error: 'Preencha nome, usuário, e-mail e papel' });
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return res.status(400).json({ error: 'Papel inválido' });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  try {
    const user = await prisma.user.create({
      data: { name, username, email, roleId, passwordHash, mustChangePassword: true },
    });
    res.status(201).json({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: role.key,
      tempPassword,
    });
  } catch {
    res.status(409).json({ error: 'E-mail ou usuário já cadastrado' });
  }
});

usersRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, roleId } = req.body as { name?: string; roleId?: number };

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(roleId ? { roleId } : {}),
    },
    include: { role: true },
  });

  res.json({ id: user.id, name: user.name, role: user.role.key });
});
