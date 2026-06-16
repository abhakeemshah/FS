import 'server-only';
import prisma from '../db';

export async function getMetric(key: string) {
  try {
    const metric = await prisma.dashboardMetric.findUnique({ where: { key } });
    return metric?.value ?? null;
  } catch {
    return null;
  }
}

export async function setMetric(key: string, value: string | null) {
  if (value === null) {
    try {
      await prisma.dashboardMetric.delete({ where: { key } });
    } catch {}
    return;
  }
  return prisma.dashboardMetric.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getAllMetrics() {
  try {
    const rows = await prisma.dashboardMetric.findMany();
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value ?? '';
    }
    return result;
  } catch {
    return {};
  }
}
