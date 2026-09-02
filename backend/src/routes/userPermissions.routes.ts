import { Router } from 'express';
import { ALL_PERMISSION_KEYS, computeEffectivePermissions, PERMISSION_CATEGORIES } from '../lib/permissions';
import { prisma } from '../lib/prisma';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const userPermissionsRouter = Router();

userPermissionsRouter.use(requireAuth, requireAdmin);

userPermissionsRouter.get('/catalog', async (_req, res) => {
  res.json(PERMISSION_CATEGORIES);
});

userPermissionsRouter.get('/:userId', async (req, res) => {
  const userId = Number(req.params.userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: true } }, permissionOverrides: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const roleMap = new Map(user.role.permissions.map((p) => [p.key, p.value]));
  const overrideMap = new Map(user.permissionOverrides.map((o) => [o.key, o.value]));
  const effective = computeEffectivePermissions(user.role.key, user.role.permissions, user.permissionOverrides);

  res.json({
    userId: user.id,
    roleKey: user.role.key,
    roleLabel: user.role.label,
    isAdmin: user.role.key === 'admin',
    permissions: Object.fromEntries(
      ALL_PERMISSION_KEYS.map((key) => [
        key,
        {
          default: roleMap.get(key) ?? false,
          override: overrideMap.has(key) ? overrideMap.get(key) : null,
          effective: effective[key],
        },
      ]),
    ),
  });
});

userPermissionsRouter.put('/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  const { overrides } = req.body as { overrides?: Record<string, boolean | null> };

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (user.role.key === 'admin') {
    return res.status(400).json({ error: 'Administradores já têm acesso total; não é possível personalizar.' });
  }

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (!ALL_PERMISSION_KEYS.includes(key)) continue;
      if (value === null) {
        await prisma.userPermissionOverride.deleteMany({ where: { userId, key } });
      } else {
        await prisma.userPermissionOverride.upsert({
          where: { userId_key: { userId, key } },
          update: { value },
          create: { userId, key, value },
        });
      }
    }
  }

  const refreshed = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: true } }, permissionOverrides: true },
  });
  const roleMap = new Map(refreshed!.role.permissions.map((p) => [p.key, p.value]));
  const overrideMap = new Map(refreshed!.permissionOverrides.map((o) => [o.key, o.value]));
  const effective = computeEffectivePermissions(refreshed!.role.key, refreshed!.role.permissions, refreshed!.permissionOverrides);

  res.json({
    userId: refreshed!.id,
    roleKey: refreshed!.role.key,
    roleLabel: refreshed!.role.label,
    isAdmin: refreshed!.role.key === 'admin',
    permissions: Object.fromEntries(
      ALL_PERMISSION_KEYS.map((key) => [
        key,
        {
          default: roleMap.get(key) ?? false,
          override: overrideMap.has(key) ? overrideMap.get(key) : null,
          effective: effective[key],
        },
      ]),
    ),
  });
});
