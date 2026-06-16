import 'server-only';
import prisma from '../db';

export type CreatePurchaseInput = {
  purchaseNumber: string;
  supplierName: string;
  sourceName?: string;
  purchaseReference?: string;
  purchaseDate: string;
  purchaseTime: string;
  paymentMethod: string;
  status: string;
  transportCost: number;
  notes?: string;
  subtotal: number;
  totalUnits: number;
  total: number;
  recordedBy?: string;
  items: Array<{
    productId?: string;
    productName: string;
    boxes: number;
    piecesPerBox: number;
    loosePieces: number;
    unitCost: number;
    totalUnits: number;
    lineTotal: number;
  }>;
};

export async function listPurchases(options?: {
  limit?: number;
  offset?: number;
  supplierName?: string;
}) {
  const where: Record<string, unknown> = {};
  if (options?.supplierName) where.supplierName = { contains: options.supplierName };

  return prisma.purchase.findMany({
    where: where as any,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
    skip: options?.offset ?? 0,
  });
}

export async function getPurchaseById(id: string) {
  return prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  });
}

export async function createPurchase(input: CreatePurchaseInput) {
  return prisma.purchase.create({
    data: {
      purchaseNumber: input.purchaseNumber,
      supplierName: input.supplierName,
      sourceName: input.sourceName ?? 'Direct',
      purchaseReference: input.purchaseReference ?? null,
      purchaseDate: input.purchaseDate,
      purchaseTime: input.purchaseTime,
      paymentMethod: input.paymentMethod,
      status: input.status,
      transportCost: input.transportCost,
      notes: input.notes ?? null,
      subtotal: input.subtotal,
      totalUnits: input.totalUnits,
      total: input.total,
      recordedBy: input.recordedBy ?? null,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId ?? null,
          productName: item.productName,
          boxes: item.boxes,
          piecesPerBox: item.piecesPerBox,
          loosePieces: item.loosePieces,
          unitCost: item.unitCost,
          totalUnits: item.totalUnits,
          lineTotal: item.lineTotal,
        })),
      },
    },
    include: { items: true },
  });
}

export async function deletePurchase(id: string) {
  return prisma.purchase.delete({ where: { id } });
}

export async function getPurchaseStats(options?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const where: Record<string, unknown> = {};
  if (options?.dateFrom || options?.dateTo) {
    const dateFilter: Record<string, string> = {};
    if (options?.dateFrom) dateFilter.gte = options.dateFrom;
    if (options?.dateTo) dateFilter.lte = options.dateTo;
    where.purchaseDate = dateFilter;
  }

  const purchases = await prisma.purchase.findMany({
    where: where as any,
    select: { total: true, transportCost: true },
  });

  return {
    totalPurchases: purchases.reduce((s, p) => s + p.total, 0),
    totalTransport: purchases.reduce((s, p) => s + p.transportCost, 0),
    count: purchases.length,
  };
}
