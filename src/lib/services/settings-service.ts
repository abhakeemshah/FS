import 'server-only';
import prisma from '../db';

export type BusinessSettingsInput = {
  shopName: string;
  shopPhone?: string;
  shopEmail?: string;
  shopAddress?: string;
  salesPrefix?: string;
  purchasePrefix?: string;
  paymentPrefix?: string;
};

export async function getBusinessSettings() {
  try {
    return await prisma.businessSetting.findUnique({
      where: { id: 'default' },
    });
  } catch {
    return null;
  }
}

export async function upsertBusinessSettings(input: BusinessSettingsInput) {
  return prisma.businessSetting.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      shopName: input.shopName,
      shopPhone: input.shopPhone ?? '',
      shopEmail: input.shopEmail ?? '',
      shopAddress: input.shopAddress ?? '',
      salesPrefix: input.salesPrefix ?? 'INV',
      purchasePrefix: input.purchasePrefix ?? 'PUR',
      paymentPrefix: input.paymentPrefix ?? 'PAY',
    },
    update: {
      shopName: input.shopName,
      shopPhone: input.shopPhone ?? '',
      shopEmail: input.shopEmail ?? '',
      shopAddress: input.shopAddress ?? '',
      salesPrefix: input.salesPrefix ?? 'INV',
      purchasePrefix: input.purchasePrefix ?? 'PUR',
      paymentPrefix: input.paymentPrefix ?? 'PAY',
    },
  });
}
