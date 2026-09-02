import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { upload } from '../lib/upload';
import { AuthedRequest, requireAdmin, requireAnyPermission, requireAuth, requirePermission } from '../middleware/auth';

export const usersRouter = Router();

usersRouter.use(requireAuth);

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 8) + '1A';
}

usersRouter.get('/', requireAnyPermission('canManageUsers', 'canManageMemberProfiles'), async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      nickname: u.nickname,
      username: u.username,
      email: u.email,
      roleId: u.roleId,
      role: u.role.key,
      roleLabel: u.role.label,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
      avatarUrl: u.avatarUrl,
      caricatureUrl: u.caricatureUrl,
      isPontaFirme: u.isPontaFirme,
    })),
  );
});

usersRouter.get('/roles', requirePermission('canManageUsers'), async (_req, res) => {
  const roles = await prisma.role.findMany({ select: { id: true, key: true, label: true } });
  res.json(roles);
});

usersRouter.post('/', requirePermission('canManageUsers'), async (req, res) => {
  const { name, username, email, roleId, password, nickname } = req.body as {
    name?: string;
    username?: string;
    email?: string;
    roleId?: number;
    password?: string;
    nickname?: string;
  };

  if (!name || !username || !email || !roleId) {
    return res.status(400).json({ error: 'Preencha nome, usuário, e-mail e papel' });
  }
  if (password && password.length < 6) {
    return res.status(400).json({ error: 'A senha temporária deve ter ao menos 6 caracteres' });
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return res.status(400).json({ error: 'Papel inválido' });

  const tempPassword = password || generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        roleId,
        passwordHash,
        mustChangePassword: true,
        ...(nickname?.trim() ? { nickname: nickname.trim() } : {}),
      },
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

usersRouter.patch('/:id', requirePermission('canManageUsers'), async (req, res) => {
  const id = Number(req.params.id);
  const { roleId } = req.body as { roleId?: number };

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(roleId ? { roleId } : {}),
    },
    include: { role: true },
  });

  res.json({ id: user.id, name: user.name, roleId: user.roleId, role: user.role.key, roleLabel: user.role.label });
});

usersRouter.delete('/:id', requireAnyPermission('canManageUsers', 'canManageMemberProfiles'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);

  if (id === req.userId) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
  }

  if (req.userRole?.key !== 'admin') {
    const target = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (target?.role.key === 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir a conta de outro administrador' });
    }
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).end();
});

usersRouter.patch(
  '/:id/profile-extras',
  requireAnyPermission('canManageUsers', 'canManageMemberProfiles'),
  async (req, res) => {
    const id = Number(req.params.id);
    const { name, nickname, caricatureUrl } = req.body as {
      name?: string;
      nickname?: string | null;
      caricatureUrl?: string | null;
    };

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(nickname !== undefined ? { nickname } : {}),
        ...(caricatureUrl !== undefined ? { caricatureUrl } : {}),
      },
    });

    res.json({ id: user.id, name: user.name, nickname: user.nickname, caricatureUrl: user.caricatureUrl });
  },
);

usersRouter.post(
  '/:id/caricature',
  requireAnyPermission('canManageUsers', 'canManageMemberProfiles'),
  upload.single('image'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Envie uma imagem' });
    const id = Number(req.params.id);

    const user = await prisma.user.update({
      where: { id },
      data: { caricatureUrl: `/uploads/${req.file.filename}` },
    });

    res.json({ id: user.id, caricatureUrl: user.caricatureUrl });
  },
);

usersRouter.patch('/:id/ponta-firme', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { isPontaFirme } = req.body as { isPontaFirme?: boolean };

  if (typeof isPontaFirme !== 'boolean') {
    return res.status(400).json({ error: 'Valor inválido' });
  }

  const user = await prisma.user.update({ where: { id }, data: { isPontaFirme } });
  res.json({ id: user.id, isPontaFirme: user.isPontaFirme });
});
