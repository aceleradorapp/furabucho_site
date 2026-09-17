import { prisma } from './prisma';

export function seasonBoundsForDate(date: Date) {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  const endYear = month === 12 ? year + 1 : year;
  const startDate = new Date(Date.UTC(endYear - 1, 11, 1)); // Dezembro (mês 11 = dezembro, 0-indexed)
  const endDate = new Date(Date.UTC(endYear, 10, 30)); // Novembro (mês 10 = novembro, 0-indexed)
  return { label: String(endYear), startDate, endDate };
}

export async function getOrCreateCurrentSeason() {
  const { label, startDate, endDate } = seasonBoundsForDate(new Date());
  return prisma.pontaFirmeSeason.upsert({
    where: { label },
    update: {},
    create: { label, startDate, endDate },
  });
}

export async function ensurePayerForUser(userId: number) {
  const season = await getOrCreateCurrentSeason();
  const existing = await prisma.pontaFirmePayer.findUnique({
    where: { seasonId_userId: { seasonId: season.id, userId } },
  });
  if (existing) {
    if (existing.removedAt) {
      return prisma.pontaFirmePayer.update({ where: { id: existing.id }, data: { removedAt: null } });
    }
    return existing;
  }
  return prisma.pontaFirmePayer.create({ data: { seasonId: season.id, userId } });
}

export async function handlePontaFirmeRemoval(userId: number) {
  const season = await getOrCreateCurrentSeason();
  const payer = await prisma.pontaFirmePayer.findUnique({
    where: { seasonId_userId: { seasonId: season.id, userId } },
    include: { _count: { select: { payments: true } } },
  });
  if (!payer) return;

  if (payer._count.payments > 0) {
    await prisma.pontaFirmePayer.update({ where: { id: payer.id }, data: { removedAt: new Date() } });
  } else {
    await prisma.pontaFirmePayer.delete({ where: { id: payer.id } });
  }
}

export const SEASON_MONTHS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function monthDatesForSeason(season: { startDate: Date }) {
  const startYear = season.startDate.getUTCFullYear();
  return SEASON_MONTHS.map((month, index) => {
    const year = index === 0 ? startYear : startYear + 1;
    return new Date(Date.UTC(year, month - 1, 1));
  });
}
