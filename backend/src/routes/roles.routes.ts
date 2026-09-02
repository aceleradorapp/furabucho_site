import { Router } from 'express';
import { ALL_PERMISSION_KEYS, PERMISSION_CATEGORIES } from '../lib/permissions';
import { prisma } from '../lib/prisma';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const rolesRouter = Router();

rolesRouter.use(requireAuth, requireAdmin);

rolesRouter.get('/catalog', async (_req, res) => {
  res.json(PERMISSION_CATEGORIES);
});

rolesRouter.get('/', async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { id: 'asc' },
    include: { permissions: true },
  });

  res.json(
    roles.map((role) => {
      const map = new Map(role.permissions.map((p) => [p.key, p.value]));
      return {
        id: role.id,
        key: role.key,
        label: role.label,
        permissions: Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, map.get(key) ?? false])),
      };
    }),
  );
});

rolesRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { label, permissions } = req.body as { label?: string; permissions?: Record<string, boolean> };

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return res.status(404).json({ error: 'Papel não encontrado' });

  if (label !== undefined) {
    await prisma.role.update({ where: { id }, data: { label } });
  }

  if (permissions) {
    for (const [key, value] of Object.entries(permissions)) {
      if (!ALL_PERMISSION_KEYS.includes(key)) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_key: { roleId: id, key } },
        update: { value: Boolean(value) },
        create: { roleId: id, key, value: Boolean(value) },
      });
    }
  }

  const updated = await prisma.role.findUnique({ where: { id }, include: { permissions: true } });
  const map = new Map(updated!.permissions.map((p) => [p.key, p.value]));

  res.json({
    id: updated!.id,
    key: updated!.key,
    label: updated!.label,
    permissions: Object.fromEntries(ALL_PERMISSION_KEYS.map((key) => [key, map.get(key) ?? false])),
  });
});
