import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth, requirePermission, requirePontaFirmeAccess } from '../middleware/auth';
import { getOrCreateCurrentSeason, monthDatesForSeason } from '../lib/pontaFirme';

export const pontaFirmeRouter = Router();

pontaFirmeRouter.use(requireAuth, requirePontaFirmeAccess);

function toNumber(value: unknown): number {
  return typeof value === 'object' && value !== null ? Number(value.toString()) : Number(value);
}

pontaFirmeRouter.get('/seasons', async (_req, res) => {
  await getOrCreateCurrentSeason();
  const seasons = await prisma.pontaFirmeSeason.findMany({ orderBy: { startDate: 'desc' } });
  const current = await getOrCreateCurrentSeason();
  res.json(seasons.map((s) => ({ id: s.id, label: s.label, startDate: s.startDate, endDate: s.endDate, isCurrent: s.id === current.id })));
});

pontaFirmeRouter.get('/seasons/:id/data', async (req, res) => {
  const seasonId = Number(req.params.id);
  const season = await prisma.pontaFirmeSeason.findUnique({ where: { id: seasonId } });
  if (!season) return res.status(404).json({ error: 'Temporada não encontrada' });

  const months = monthDatesForSeason(season);

  const payers = await prisma.pontaFirmePayer.findMany({
    where: { seasonId },
    include: {
      user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      payments: { orderBy: { monthDate: 'asc' } },
    },
  });

  const enriched = payers.map((p) => {
    const paymentsByMonth = new Map(p.payments.map((pay) => [pay.monthDate.toISOString().slice(0, 10), pay]));
    const monthsPaid = p.payments.length;
    const totalPaid = p.payments.reduce((sum, pay) => sum + toNumber(pay.amount), 0);
    const lastPayment = p.payments[p.payments.length - 1] ?? null;

    return {
      id: p.id,
      userId: p.userId,
      name: p.user?.nickname || p.user?.name || p.displayName || 'Sem nome',
      avatarUrl: p.user?.avatarUrl ?? null,
      isClaimed: !!p.userId,
      removedAt: p.removedAt,
      monthsPaid,
      totalPaid,
      lastPaidMonthDate: lastPayment?.monthDate ?? null,
      lastPaidAt: lastPayment?.paidAt ?? null,
      payments: months.map((monthDate) => {
        const key = monthDate.toISOString().slice(0, 10);
        const pay = paymentsByMonth.get(key);
        return {
          monthDate,
          amount: pay ? toNumber(pay.amount) : null,
          paidAt: pay?.paidAt ?? null,
          paymentId: pay?.id ?? null,
        };
      }),
    };
  });

  enriched.sort((a, b) => {
    if (b.monthsPaid !== a.monthsPaid) return b.monthsPaid - a.monthsPaid;
    const aTime = a.lastPaidAt ? new Date(a.lastPaidAt).getTime() : Infinity;
    const bTime = b.lastPaidAt ? new Date(b.lastPaidAt).getTime() : Infinity;
    if (aTime !== bTime) return aTime - bTime;
    return a.id - b.id;
  });

  res.json({
    season: { id: season.id, label: season.label, startDate: season.startDate, endDate: season.endDate },
    months,
    payers: enriched,
    totalArrecadado: enriched.reduce((sum, p) => sum + p.totalPaid, 0),
  });
});

pontaFirmeRouter.get('/claimable-users', requirePermission('pontaFirme.manage'), async (req, res) => {
  const seasonId = Number(req.query.seasonId);
  const alreadyLinked = await prisma.pontaFirmePayer.findMany({
    where: { seasonId, userId: { not: null } },
    select: { userId: true },
  });
  const excludeIds = alreadyLinked.map((p) => p.userId as number);

  const users = await prisma.user.findMany({
    where: { id: { notIn: excludeIds } },
    select: { id: true, name: true, nickname: true, avatarUrl: true, email: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

pontaFirmeRouter.post('/seasons/:id/payers', requirePermission('pontaFirme.manage'), async (req, res) => {
  const seasonId = Number(req.params.id);
  const { userId, displayName } = req.body as { userId?: number; displayName?: string };

  if (!userId && !displayName?.trim()) {
    return res.status(400).json({ error: 'Informe um usuário ou um nome' });
  }

  try {
    const payer = await prisma.pontaFirmePayer.create({
      data: {
        seasonId,
        ...(userId ? { userId } : { displayName: displayName?.trim() }),
      },
    });
    res.status(201).json(payer);
  } catch {
    res.status(409).json({ error: 'Esse usuário já está nessa temporada' });
  }
});

pontaFirmeRouter.patch('/payers/:id', requirePermission('pontaFirme.manage'), async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { userId, displayName, removed } = req.body as { userId?: number; displayName?: string; removed?: boolean };

  const payer = await prisma.pontaFirmePayer.update({
    where: { id },
    data: {
      ...(userId !== undefined ? { userId, displayName: null } : {}),
      ...(displayName !== undefined ? { displayName } : {}),
      ...(removed !== undefined ? { removedAt: removed ? new Date() : null } : {}),
    },
  });
  res.json(payer);
});

pontaFirmeRouter.delete('/payers/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.pontaFirmePayer.delete({ where: { id } });
  res.status(204).end();
});

pontaFirmeRouter.post('/payers/:id/payments', requirePermission('pontaFirme.manage'), async (req, res) => {
  const payerId = Number(req.params.id);
  const { monthDate, amount, paidAt } = req.body as { monthDate?: string; amount?: number; paidAt?: string };

  if (!monthDate || amount === undefined || !paidAt) {
    return res.status(400).json({ error: 'Informe o mês, o valor e a data do pagamento' });
  }

  try {
    const payment = await prisma.pontaFirmePayment.create({
      data: { payerId, monthDate: new Date(monthDate), amount, paidAt: new Date(paidAt) },
    });
    res.status(201).json(payment);
  } catch {
    res.status(409).json({ error: 'Esse mês já tem pagamento registrado pra essa pessoa' });
  }
});

pontaFirmeRouter.patch('/payments/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const { amount, paidAt } = req.body as { amount?: number; paidAt?: string };

  const payment = await prisma.pontaFirmePayment.update({
    where: { id },
    data: {
      ...(amount !== undefined ? { amount } : {}),
      ...(paidAt !== undefined ? { paidAt: new Date(paidAt) } : {}),
    },
  });
  res.json(payment);
});

pontaFirmeRouter.delete('/payments/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.pontaFirmePayment.delete({ where: { id } });
  res.status(204).end();
});
