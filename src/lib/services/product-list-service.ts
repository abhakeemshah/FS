import 'server-only';
import prisma from '../db';

export type CreateProductListInput = {
  name: string;
  visibleOnLanding?: boolean;
  productIds?: string[];
};

export async function listProductLists() {
  return prisma.productList.findMany({
    include: {
      items: {
        include: { product: true },
      },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createProductList(input: CreateProductListInput) {
  return prisma.productList.create({
    data: {
      name: input.name,
      visibleOnLanding: input.visibleOnLanding ?? true,
      items: input.productIds?.length
        ? {
            create: input.productIds.map((productId) => ({
              productId,
            })),
          }
        : undefined,
    },
    include: {
      items: {
        include: { product: true },
      },
    },
  });
}

export async function updateProductList(id: string, input: Partial<CreateProductListInput>) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.visibleOnLanding !== undefined) data.visibleOnLanding = input.visibleOnLanding;

  await prisma.productListItem.deleteMany({ where: { listId: id } });

  if (input.productIds?.length) {
    await prisma.productListItem.createMany({
      data: input.productIds.map((productId) => ({ listId: id, productId })),
    });
  }

  return prisma.productList.update({
    where: { id },
    data: data as any,
    include: {
      items: {
        include: { product: true },
      },
    },
  });
}

export async function deleteProductList(id: string) {
  return prisma.productList.delete({ where: { id } });
}
