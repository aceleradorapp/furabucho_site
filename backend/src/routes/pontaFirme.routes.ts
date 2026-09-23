import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { AuthedRequest, requireAuth, requirePermission, requirePontaFirmeAccess } from '../middleware/auth';
import { getOrCreateCurrentSeason, monthDatesForSeason } from '../lib/pontaFirme';

export const pontaFirmeRouter = Router();

pontaFirmeRouter.use(requireAuth, requirePontaFirmeAccess);

function toNumber(value: unknown): number {
  return typeof value === 'object' && value !== null ? Number(value.toString()) : Number(value);
}

const PAYMENT_TYPES = ['inteiro', 'meio', 'nao_paga'] as const;
type PaymentType = (typeof PAYMENT_TYPES)[number];

function isPaymentType(value: unknown): value is PaymentType {
  return typeof value === 'string' && (PAYMENT_TYPES as readonly string[]).includes(value);
}

function paymentMultiplier(type: string): number {
  if (type === 'meio') return 0.5;
  if (type === 'nao_paga') return 0;
  return 1;
}

pontaFirmeRouter.get('/seasons', async (_req, res) => {
  await getOrCreateCurrentSeason();
  const seasons = await prisma.pontaFirmeSeason.findMany({ orderBy: { startDate: 'desc' } });
  const current = await getOrCreateCurrentSeason();
  res.json(seasons.map((s) => ({ id: s.id, label: s.label, startDate: s.startDate, endDate: s.endDate, isCurrent: s.id === current.id })));
});

pontaFirmeRouter.get('/seasons/:id/data', async (req: AuthedRequest, res) => {
  const seasonId = Number(req.params.id);
  const season = await prisma.pontaFirmeSeason.findUnique({ where: { id: seasonId } });
  if (!season) return res.status(404).json({ error: 'Temporada não encontrada' });

  const months = monthDatesForSeason(season);

  // Quem nao e pagante anual (ou saiu no meio do ano) some da lista pra quem so acompanha;
  // admin/ajudante continuam vendo tudo, com o selo "removido", pra manter o historico visivel.
  // O total Arrecadado sempre soma todo mundo -- o dinheiro que ja entrou nao desaparece do
  // Balanco so porque a pessoa nao aparece mais na lista de cobranca.
  const canManage = !!req.effectivePermissions?.['pontaFirme.manage'];

  const allPayers = await prisma.pontaFirmePayer.findMany({
    where: { seasonId },
    include: {
      user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      payments: { orderBy: { monthDate: 'asc' } },
    },
  });
  const payers = canManage ? allPayers : allPayers.filter((p) => !p.removedAt);

  const enrich = (p: (typeof allPayers)[number]) => {
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
  };

  const enriched = payers.map(enrich);

  enriched.sort((a, b) => {
    if (b.monthsPaid !== a.monthsPaid) return b.monthsPaid - a.monthsPaid;
    const aTime = a.lastPaidAt ? new Date(a.lastPaidAt).getTime() : Infinity;
    const bTime = b.lastPaidAt ? new Date(b.lastPaidAt).getTime() : Infinity;
    if (aTime !== bTime) return aTime - bTime;
    return a.id - b.id;
  });

  const totalArrecadado = allPayers.reduce(
    (sum, p) => sum + p.payments.reduce((s, pay) => s + toNumber(pay.amount), 0),
    0,
  );

  res.json({
    season: { id: season.id, label: season.label, startDate: season.startDate, endDate: season.endDate },
    months,
    payers: enriched,
    totalArrecadado,
  });
});

pontaFirmeRouter.get('/claimable-users', requirePermission('pontaFirme.manage'), async (req, res) => {
  const seasonId = Number(req.query.seasonId);
  const includeLinked = req.query.includeLinked === '1';

  const alreadyLinked = await prisma.pontaFirmePayer.findMany({
    where: { seasonId, userId: { not: null } },
    select: { userId: true },
  });
  const linkedIds = new Set(alreadyLinked.map((p) => p.userId as number));

  const users = await prisma.user.findMany({
    where: includeLinked ? undefined : { id: { notIn: Array.from(linkedIds) } },
    select: { id: true, name: true, nickname: true, avatarUrl: true, email: true },
    orderBy: { name: 'asc' },
  });
  res.json(users.map((u) => ({ ...u, alreadyLinkedElsewhere: linkedIds.has(u.id) })));
});

pontaFirmeRouter.get('/event-claimable-users', requirePermission('pontaFirme.manage'), async (req, res) => {
  const seasonId = Number(req.query.seasonId);
  const alreadyLinked = await prisma.pontaFirmeEventPayer.findMany({
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

  if (userId !== undefined) {
    const payer = await prisma.pontaFirmePayer.findUnique({ where: { id } });
    if (!payer) return res.status(404).json({ error: 'Registro não encontrado' });

    const duplicate = await prisma.pontaFirmePayer.findUnique({
      where: { seasonId_userId: { seasonId: payer.seasonId, userId } },
    });

    if (duplicate && duplicate.id !== id) {
      // Essa conta já tem outro registro nessa temporada (normalmente vazio, criado ao marcar o
      // selo Ponta Firme) — junta os pagamentos dele aqui e remove o duplicado, em vez de travar
      // por causa da constraint unica de seasonId+userId.
      const [duplicatePayments, existingPayments] = await Promise.all([
        prisma.pontaFirmePayment.findMany({ where: { payerId: duplicate.id } }),
        prisma.pontaFirmePayment.findMany({ where: { payerId: id }, select: { monthDate: true } }),
      ]);
      const existingMonths = new Set(existingPayments.map((p) => p.monthDate.toISOString()));
      const paymentsToMove = duplicatePayments.filter((p) => !existingMonths.has(p.monthDate.toISOString()));

      await prisma.$transaction([
        ...paymentsToMove.map((p) =>
          prisma.pontaFirmePayment.create({
            data: { payerId: id, monthDate: p.monthDate, amount: p.amount, paidAt: p.paidAt },
          }),
        ),
        prisma.pontaFirmePayer.delete({ where: { id: duplicate.id } }),
        prisma.pontaFirmePayer.update({ where: { id }, data: { userId, displayName: null } }),
      ]);

      const merged = await prisma.pontaFirmePayer.findUnique({ where: { id } });
      return res.json(merged);
    }
  }

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

pontaFirmeRouter.get('/seasons/:id/expenses', async (req, res) => {
  const seasonId = Number(req.params.id);

  const cards = await prisma.pontaFirmeExpenseCard.findMany({
    where: { seasonId },
    include: { items: { orderBy: { createdAt: 'asc' } } },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  const enriched = cards.map((c) => ({
    id: c.id,
    title: c.title,
    items: c.items.map((i) => ({ id: i.id, label: i.label, amount: toNumber(i.amount) })),
    total: c.items.reduce((sum, i) => sum + toNumber(i.amount), 0),
  }));

  res.json({
    cards: enriched,
    totalGastos: enriched.reduce((sum, c) => sum + c.total, 0),
  });
});

pontaFirmeRouter.post('/seasons/:id/expenses', requirePermission('pontaFirme.manage'), async (req, res) => {
  const seasonId = Number(req.params.id);
  const { title } = req.body as { title?: string };
  if (!title?.trim()) return res.status(400).json({ error: 'Informe um título' });

  const lastCard = await prisma.pontaFirmeExpenseCard.findFirst({ where: { seasonId }, orderBy: { order: 'desc' } });

  const card = await prisma.pontaFirmeExpenseCard.create({
    data: { seasonId, title: title.trim(), order: (lastCard?.order ?? -1) + 1 },
  });
  res.status(201).json(card);
});

pontaFirmeRouter.patch('/expenses/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const { title } = req.body as { title?: string };
  if (!title?.trim()) return res.status(400).json({ error: 'Informe um título' });

  const card = await prisma.pontaFirmeExpenseCard.update({ where: { id }, data: { title: title.trim() } });
  res.json(card);
});

pontaFirmeRouter.delete('/expenses/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.pontaFirmeExpenseCard.delete({ where: { id } });
  res.status(204).end();
});

pontaFirmeRouter.post('/expenses/:id/items', requirePermission('pontaFirme.manage'), async (req, res) => {
  const cardId = Number(req.params.id);
  const { label, amount } = req.body as { label?: string; amount?: number };
  if (!label?.trim() || amount === undefined) {
    return res.status(400).json({ error: 'Informe a descrição e o valor do gasto' });
  }

  const item = await prisma.pontaFirmeExpenseItem.create({ data: { cardId, label: label.trim(), amount } });
  res.status(201).json(item);
});

pontaFirmeRouter.patch('/expense-items/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const { label, amount } = req.body as { label?: string; amount?: number };

  const item = await prisma.pontaFirmeExpenseItem.update({
    where: { id },
    data: {
      ...(label !== undefined ? { label: label.trim() } : {}),
      ...(amount !== undefined ? { amount } : {}),
    },
  });
  res.json(item);
});

pontaFirmeRouter.delete('/expense-items/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.pontaFirmeExpenseItem.delete({ where: { id } });
  res.status(204).end();
});

pontaFirmeRouter.get('/seasons/:id/event-payers', async (req, res) => {
  const seasonId = Number(req.params.id);

  const payers = await prisma.pontaFirmeEventPayer.findMany({
    where: { seasonId },
    include: {
      user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      guests: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const enriched = payers.map((p) => {
    const value = toNumber(p.valuePerPerson);
    const payerAmount = value * paymentMultiplier(p.paymentType);
    const guests = p.guests.map((g) => ({
      id: g.id,
      name: g.name,
      paymentType: g.paymentType,
      amount: value * paymentMultiplier(g.paymentType),
    }));
    const total = payerAmount + guests.reduce((sum, g) => sum + g.amount, 0);

    return {
      id: p.id,
      userId: p.userId,
      name: p.user?.nickname || p.user?.name || p.displayName || 'Sem nome',
      avatarUrl: p.user?.avatarUrl ?? null,
      isClaimed: !!p.userId,
      valuePerPerson: value,
      paymentType: p.paymentType,
      payerAmount,
      guests,
      quantity: 1 + guests.length,
      total,
    };
  });

  res.json({
    payers: enriched,
    totalArrecadadoEvento: enriched.reduce((sum, p) => sum + p.total, 0),
  });
});

pontaFirmeRouter.post('/seasons/:id/event-payers', requirePermission('pontaFirme.manage'), async (req, res) => {
  const seasonId = Number(req.params.id);
  const { userId, displayName, valuePerPerson, paymentType, guests } = req.body as {
    userId?: number;
    displayName?: string;
    valuePerPerson?: number;
    paymentType?: string;
    guests?: { name: string; paymentType?: string }[];
  };

  if (!userId && !displayName?.trim()) {
    return res.status(400).json({ error: 'Informe um usuário ou um nome' });
  }
  if (valuePerPerson === undefined || valuePerPerson <= 0) {
    return res.status(400).json({ error: 'Informe o valor por pessoa' });
  }
  if (paymentType !== undefined && !isPaymentType(paymentType)) {
    return res.status(400).json({ error: 'Tipo de pagamento inválido' });
  }

  const cleanGuests = (guests ?? [])
    .map((g) => ({ name: g.name?.trim() ?? '', paymentType: isPaymentType(g.paymentType) ? g.paymentType : 'inteiro' }))
    .filter((g) => g.name);

  try {
    const payer = await prisma.pontaFirmeEventPayer.create({
      data: {
        seasonId,
        valuePerPerson,
        ...(paymentType ? { paymentType } : {}),
        ...(userId ? { userId } : { displayName: displayName?.trim() }),
        ...(cleanGuests.length > 0 ? { guests: { create: cleanGuests } } : {}),
      },
      include: { guests: true },
    });
    res.status(201).json(payer);
  } catch {
    res.status(409).json({ error: 'Esse usuário já está cadastrado nessa temporada' });
  }
});

pontaFirmeRouter.patch('/event-payers/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const { userId, displayName, valuePerPerson, paymentType } = req.body as {
    userId?: number;
    displayName?: string;
    valuePerPerson?: number;
    paymentType?: string;
  };

  if (paymentType !== undefined && !isPaymentType(paymentType)) {
    return res.status(400).json({ error: 'Tipo de pagamento inválido' });
  }

  const payer = await prisma.pontaFirmeEventPayer.update({
    where: { id },
    data: {
      ...(userId !== undefined ? { userId, displayName: null } : {}),
      ...(displayName !== undefined ? { displayName } : {}),
      ...(valuePerPerson !== undefined ? { valuePerPerson } : {}),
      ...(paymentType !== undefined ? { paymentType } : {}),
    },
  });
  res.json(payer);
});

pontaFirmeRouter.delete('/event-payers/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.pontaFirmeEventPayer.delete({ where: { id } });
  res.status(204).end();
});

pontaFirmeRouter.post('/event-payers/:id/guests', requirePermission('pontaFirme.manage'), async (req, res) => {
  const payerId = Number(req.params.id);
  const { name, paymentType } = req.body as { name?: string; paymentType?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'Informe o nome da pessoa' });
  if (paymentType !== undefined && !isPaymentType(paymentType)) {
    return res.status(400).json({ error: 'Tipo de pagamento inválido' });
  }

  const guest = await prisma.pontaFirmeEventGuest.create({
    data: { payerId, name: name.trim(), ...(paymentType ? { paymentType } : {}) },
  });
  res.status(201).json(guest);
});

pontaFirmeRouter.patch('/event-guests/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  const { name, paymentType } = req.body as { name?: string; paymentType?: string };
  if (name !== undefined && !name.trim()) return res.status(400).json({ error: 'Informe o nome da pessoa' });
  if (paymentType !== undefined && !isPaymentType(paymentType)) {
    return res.status(400).json({ error: 'Tipo de pagamento inválido' });
  }

  const guest = await prisma.pontaFirmeEventGuest.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(paymentType !== undefined ? { paymentType } : {}),
    },
  });
  res.json(guest);
});

pontaFirmeRouter.delete('/event-guests/:id', requirePermission('pontaFirme.manage'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.pontaFirmeEventGuest.delete({ where: { id } });
  res.status(204).end();
});
