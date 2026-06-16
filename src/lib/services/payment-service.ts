import 'server-only';
import prisma from '../db';

export type CreatePaymentInput = {
  paymentNumber: string;
  title: string;
  party: string;
  direction: 'Incoming' | 'Outgoing';
  amount: number;
  date: string;
  time: string;
  notes?: string;
  recordedBy?: string;
};

export async function listPayments(options?: {
  limit?: number;
  offset?: number;
  party?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const where: Record<string, unknown> = {};
  if (options?.party) where.party = { contains: options.party };
  if (options?.direction) where.direction = options.direction;
  if (options?.dateFrom || options?.dateTo) {
    const dateFilter: Record<string, string> = {};
    if (options?.dateFrom) dateFilter.gte = options.dateFrom;
    if (options?.dateTo) dateFilter.lte = options.dateTo;
    where.date = dateFilter;
  }

  return prisma.payment.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
    skip: options?.offset ?? 0,
  });
}

export async function createPayment(input: CreatePaymentInput) {
  return prisma.payment.create({
    data: {
      paymentNumber: input.paymentNumber,
      title: input.title,
      party: input.party,
      direction: input.direction,
      amount: input.amount,
      date: input.date,
      time: input.time,
      notes: input.notes ?? null,
      recordedBy: input.recordedBy ?? null,
    },
  });
}

export async function deletePayment(id: string) {
  return prisma.payment.delete({ where: { id } });
}

export async function getPaymentStats(options?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const where: Record<string, unknown> = {};
  if (options?.dateFrom || options?.dateTo) {
    const dateFilter: Record<string, string> = {};
    if (options?.dateFrom) dateFilter.gte = options.dateFrom;
    if (options?.dateTo) dateFilter.lte = options.dateTo;
    where.date = dateFilter;
  }

  const payments = await prisma.payment.findMany({
    where: where as any,
    select: { amount: true, direction: true },
  });

  return {
    incoming: payments.filter((p) => p.direction === 'Incoming').reduce((s, p) => s + p.amount, 0),
    outgoing: payments.filter((p) => p.direction === 'Outgoing').reduce((s, p) => s + p.amount, 0),
    count: payments.length,
  };
}
