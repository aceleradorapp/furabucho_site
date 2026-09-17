import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth, requirePermission } from '../middleware/auth';

export const pioneiroConversionRouter = Router();

pioneiroConversionRouter.use(requireAuth, requirePermission('pioneiros.manage'));

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 8) + '1A';
}

pioneiroConversionRouter.get('/', async (_req, res) => {
  const pioneiros = await prisma.pioneiro.findMany({
    orderBy: { points: 'desc' },
    include: {
      convertedUser: { select: { id: true, name: true, username: true } },
    },
  });

  res.json(
    pioneiros.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      points: p.points,
      status: p.status,
      createdAt: p.createdAt,
      convertedUser: p.convertedUser,
    })),
  );
});

interface ConvertItem {
  pioneiroId: number;
  name?: string;
  username?: string;
  email?: string;
  whatsapp?: string;
  roleId?: number | string;
  password?: string;
}

pioneiroConversionRouter.post('/convert', async (req: AuthedRequest, res) => {
  const { items } = req.body as { items?: ConvertItem[] };

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um pioneiro' });
  }

  const canChangeRole = req.effectivePermissions?.['members.changeRole'] ?? false;
  const membroRole = await prisma.role.findUnique({ where: { key: 'membro' } });

  const results: { pioneiroId: number; ok: boolean; user?: { id: number; username: string }; tempPassword?: string; error?: string }[] = [];

  for (const item of items) {
    const pioneiroId = Number(item.pioneiroId);
    const name = item.name?.trim();
    const username = item.username?.trim();
    const email = item.email?.trim().toLowerCase() || null;
    const whatsapp = item.whatsapp?.trim() || null;

    if (!name || !username) {
      results.push({ pioneiroId, ok: false, error: 'Preencha nome e usuário' });
      continue;
    }
    if (!email && !whatsapp) {
      results.push({ pioneiroId, ok: false, error: 'Informe ao menos um e-mail ou WhatsApp' });
      continue;
    }

    const pioneiro = await prisma.pioneiro.findUnique({ where: { id: pioneiroId } });
    if (!pioneiro) {
      results.push({ pioneiroId, ok: false, error: 'Pioneiro não encontrado' });
      continue;
    }
    if (pioneiro.convertedUserId) {
      results.push({ pioneiroId, ok: false, error: 'Esse pioneiro já foi enviado pro cadastro de membros' });
      continue;
    }

    let roleId = canChangeRole ? Number(item.roleId) || undefined : undefined;
    if (!roleId) roleId = membroRole?.id;
    if (!roleId) {
      results.push({ pioneiroId, ok: false, error: 'Papel inválido' });
      continue;
    }

    const tempPassword = item.password?.trim() || generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { name, username, email, whatsapp, roleId: roleId as number, passwordHash, mustChangePassword: true },
        });
        await tx.pioneiro.update({ where: { id: pioneiroId }, data: { convertedUserId: created.id } });
        return created;
      });

      results.push({ pioneiroId, ok: true, user: { id: user.id, username: user.username }, tempPassword });
    } catch {
      results.push({ pioneiroId, ok: false, error: 'E-mail, WhatsApp ou usuário já cadastrado' });
    }
  }

  res.json({ results });
});
