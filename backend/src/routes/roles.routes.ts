import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const rolesRouter = Router();

rolesRouter.use(requireAuth, requireAdmin);

rolesRouter.get('/', async (_req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
  res.json(roles);
});

rolesRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { label, canManageUsers, canManageSettings, canManagePosts, canManageGallery, canManageMemberProfiles } =
    req.body as {
      label?: string;
      canManageUsers?: boolean;
      canManageSettings?: boolean;
      canManagePosts?: boolean;
      canManageGallery?: boolean;
      canManageMemberProfiles?: boolean;
    };

  const role = await prisma.role.update({
    where: { id },
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(canManageUsers !== undefined ? { canManageUsers } : {}),
      ...(canManageSettings !== undefined ? { canManageSettings } : {}),
      ...(canManagePosts !== undefined ? { canManagePosts } : {}),
      ...(canManageGallery !== undefined ? { canManageGallery } : {}),
      ...(canManageMemberProfiles !== undefined ? { canManageMemberProfiles } : {}),
    },
  });

  res.json(role);
});
