import bcrypt from 'bcrypt';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { SENHA_PADRAO } from '../lib/senha';
import { upload } from '../lib/upload';
import { AuthedRequest, requireAnyPermission, requireAuth, requirePermission } from '../middleware/auth';
import { ensurePayerForUser, handlePontaFirmeRemoval } from '../lib/pontaFirme';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', requirePermission('members.view'), async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      nickname: u.nickname,
      whatsapp: u.whatsapp,
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
      isPontaFirmePagante: u.isPontaFirmePagante,
      isVeterano: u.isVeterano,
      birthDate: u.birthDate,
    })),
  );
});

usersRouter.get('/roles', requireAnyPermission('members.create', 'members.changeRole'), async (_req, res) => {
  const roles = await prisma.role.findMany({ select: { id: true, key: true, label: true } });
  res.json(roles);
});

usersRouter.post(
  '/',
  requirePermission('members.create'),
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'caricature', maxCount: 1 },
  ]),
  async (req: AuthedRequest, res) => {
    const { name, username, email, password, nickname, whatsapp } = req.body as {
      name?: string;
      username?: string;
      email?: string;
      password?: string;
      nickname?: string;
      whatsapp?: string;
    };
    let { roleId } = req.body as { roleId?: string | number };

    const trimmedEmail = email?.trim().toLowerCase() || null;
    const trimmedWhatsapp = whatsapp?.trim() || null;

    if (!name || !username) {
      return res.status(400).json({ error: 'Preencha nome e usuário' });
    }
    if (!trimmedEmail && !trimmedWhatsapp) {
      return res.status(400).json({ error: 'Informe ao menos um e-mail ou WhatsApp' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'A senha temporária deve ter ao menos 6 caracteres' });
    }

    if (!req.effectivePermissions?.['members.changeRole']) {
      const membro = await prisma.role.findUnique({ where: { key: 'membro' } });
      roleId = membro?.id;
    }
    if (!roleId) return res.status(400).json({ error: 'Papel inválido' });

    const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
    if (!role) return res.status(400).json({ error: 'Papel inválido' });

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const avatarFile = files?.avatar?.[0];
    const caricatureFile = files?.caricature?.[0];

    // Sempre a mesma senha de balcao, pra dar pra ditar por telefone sem soletrar. Ela nao
    // sobrevive ao primeiro acesso: 'mustChangePassword' abaixo obriga a trocar.
    const tempPassword = password || SENHA_PADRAO;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    try {
      const user = await prisma.user.create({
        data: {
          name,
          username,
          email: trimmedEmail,
          whatsapp: trimmedWhatsapp,
          roleId: role.id,
          passwordHash,
          mustChangePassword: true,
          ...(nickname?.trim() ? { nickname: nickname.trim() } : {}),
          ...(avatarFile ? { avatarUrl: `/uploads/${avatarFile.filename}` } : {}),
          ...(caricatureFile ? { caricatureUrl: `/uploads/${caricatureFile.filename}` } : {}),
        },
      });
      res.status(201).json({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        whatsapp: user.whatsapp,
        role: role.key,
        tempPassword,
      });
    } catch {
      res.status(409).json({ error: 'E-mail, WhatsApp ou usuário já cadastrado' });
    }
  },
);

usersRouter.patch('/:id', requirePermission('members.changeRole'), async (req, res) => {
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

usersRouter.delete('/:id', requirePermission('members.delete'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);

  if (id === req.userId) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
  }

  if (req.userRoleKey !== 'admin') {
    const target = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (target?.role.key === 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir a conta de outro administrador' });
    }
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).end();
});

usersRouter.patch('/:id/profile-extras', requirePermission('members.editProfile'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, nickname, whatsapp, avatarUrl, caricatureUrl, birthDate } = req.body as {
    name?: string;
    nickname?: string | null;
    whatsapp?: string | null;
    avatarUrl?: string | null;
    caricatureUrl?: string | null;
    birthDate?: string | null;
  };

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(nickname !== undefined ? { nickname } : {}),
      ...(whatsapp !== undefined ? { whatsapp } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      ...(caricatureUrl !== undefined ? { caricatureUrl } : {}),
      ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
    },
  });

  res.json({
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    whatsapp: user.whatsapp,
    avatarUrl: user.avatarUrl,
    caricatureUrl: user.caricatureUrl,
    birthDate: user.birthDate,
  });
});

usersRouter.post('/:id/avatar', requirePermission('members.editProfile'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem' });
  const id = Number(req.params.id);

  const user = await prisma.user.update({
    where: { id },
    data: { avatarUrl: `/uploads/${req.file.filename}` },
  });

  res.json({ id: user.id, avatarUrl: user.avatarUrl });
});

usersRouter.post(
  '/:id/caricature',
  requirePermission('members.editProfile'),
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

usersRouter.patch('/:id/patentes', requirePermission('members.editProfile'), async (req, res) => {
  const id = Number(req.params.id);
  const { isPontaFirme, isPontaFirmePagante, isVeterano } = req.body as {
    isPontaFirme?: boolean;
    isPontaFirmePagante?: boolean;
    isVeterano?: boolean;
  };

  if (isPontaFirme === undefined && isPontaFirmePagante === undefined && isVeterano === undefined) {
    return res.status(400).json({ error: 'Nada pra atualizar' });
  }

  const existing = await prisma.user.findUnique({ where: { id }, select: { isPontaFirme: true, isPontaFirmePagante: true } });
  if (!existing) return res.status(404).json({ error: 'Membro não encontrado' });

  const resultingIsPontaFirme = isPontaFirme ?? existing.isPontaFirme;
  // Nao dar pra ser Pagante Anual sem ser Ponta Firme -- se tirar o Ponta Firme, o pagante cai junto.
  const resultingIsPagante = resultingIsPontaFirme ? (isPontaFirmePagante ?? existing.isPontaFirmePagante) : false;

  const pagameChanged = resultingIsPagante !== existing.isPontaFirmePagante;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(isPontaFirme !== undefined ? { isPontaFirme } : {}),
      isPontaFirmePagante: resultingIsPagante,
      ...(isVeterano !== undefined ? { isVeterano } : {}),
    },
  });

  if (pagameChanged) {
    if (resultingIsPagante) {
      await ensurePayerForUser(user.id);
    } else {
      await handlePontaFirmeRemoval(user.id);
    }
  }

  res.json({
    id: user.id,
    isPontaFirme: user.isPontaFirme,
    isPontaFirmePagante: user.isPontaFirmePagante,
    isVeterano: user.isVeterano,
  });
});
