import 'server-only';
import prisma from '../db';

export type CreateInvoiceInput = {
  invoiceNumber: string;
  date: string;
  time: string;
  customerName: string;
  customerContact?: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  profit: number;
  total: number;
  recordedBy?: string;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    price: number;
    costPrice: number;
    discount: number;
    total: number;
    profit: number;
  }>;
};

export type InvoiceRecord = Awaited<ReturnType<typeof listInvoices>>[number];

export async function listInvoices(options?: {
  limit?: number;
  offset?: number;
  customerName?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const where: Record<string, unknown> = {};
  if (options?.customerName) where.customerName = { contains: options.customerName };
  if (options?.dateFrom || options?.dateTo) {
    const dateFilter: Record<string, string> = {};
    if (options?.dateFrom) dateFilter.gte = options.dateFrom;
    if (options?.dateTo) dateFilter.lte = options.dateTo;
    where.date = dateFilter;
  }

  return prisma.invoice.findMany({
    where: where as any,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
    skip: options?.offset ?? 0,
  });
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  return prisma.invoice.findUnique({
    where: { invoiceNumber },
    include: { items: true },
  });
}

export async function createInvoice(input: CreateInvoiceInput) {
  return prisma.invoice.create({
    data: {
      invoiceNumber: input.invoiceNumber,
      date: input.date,
      time: input.time,
      customerName: input.customerName,
      customerContact: input.customerContact ?? null,
      paymentMethod: input.paymentMethod,
      subtotal: input.subtotal,
      discount: input.discount,
      profit: input.profit,
      total: input.total,
      recordedBy: input.recordedBy ?? null,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId ?? null,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          costPrice: item.costPrice,
          discount: item.discount,
          total: item.total,
          profit: item.profit,
        })),
      },
    },
    include: { items: true },
  });
}

export async function deleteInvoice(id: string) {
  return prisma.invoice.delete({ where: { id } });
}

export async function getSalesStats(options?: {
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

  const invoices = await prisma.invoice.findMany({
    where: where as any,
    select: { total: true, profit: true, discount: true },
  });

  return {
    totalSales: invoices.reduce((s, i) => s + i.total, 0),
    totalProfit: invoices.reduce((s, i) => s + i.profit, 0),
    totalDiscount: invoices.reduce((s, i) => s + i.discount, 0),
    count: invoices.length,
  };
}
