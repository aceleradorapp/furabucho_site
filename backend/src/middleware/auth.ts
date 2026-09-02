import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { computeEffectivePermissions } from '../lib/permissions';
import { prisma } from '../lib/prisma';

export interface AuthedRequest extends Request {
  userId?: number;
  userRoleKey?: string;
  effectivePermissions?: Record<string, boolean>;
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
      include: { role: { include: { permissions: true } }, permissionOverrides: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.userId = user.id;
    req.userRoleKey = user.role.key;
    req.effectivePermissions = computeEffectivePermissions(user.role.key, user.role.permissions, user.permissionOverrides);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function requirePermission(key: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.effectivePermissions?.[key]) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
    next();
  };
}

export function requireAnyPermission(...keys: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!keys.some((key) => req.effectivePermissions?.[key])) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
    next();
  };
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRoleKey !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem acessar isto' });
  }
  next();
}
