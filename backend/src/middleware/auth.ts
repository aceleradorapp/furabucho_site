import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthedRequest extends Request {
  userId?: number;
  userRole?: {
    key: string;
    canManageUsers: boolean;
    canManageSettings: boolean;
    canManagePosts: boolean;
    canManageGallery: boolean;
  };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: 'Token ausente' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.userId = user.id;
    req.userRole = {
      key: user.role.key,
      canManageUsers: user.role.canManageUsers,
      canManageSettings: user.role.canManageSettings,
      canManagePosts: user.role.canManagePosts,
      canManageGallery: user.role.canManageGallery,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

type PermissionKey = 'canManageUsers' | 'canManageSettings' | 'canManagePosts' | 'canManageGallery';

export function requirePermission(permission: PermissionKey) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole?.[permission]) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
    next();
  };
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRole?.key !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem acessar isto' });
  }
  next();
}
