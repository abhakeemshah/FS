import 'server-only';
import prisma from '../db';

export type CreateProductInput = {
  name: string;
  sku: string;
  categoryId: string;
  bio?: string;
  imageUrls?: string[];
  price: number;
  costPrice: number;
  stock: number;
  status?: 'active' | 'draft';
  showOnLanding?: boolean;
  showOnExtraLanding?: boolean;
  showOnSecondaryLanding?: boolean;
};

export async function listProducts(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  status?: string;
  search?: string;
}) {
  const where: Record<string, unknown> = {};
  if (options?.categoryId) where.categoryId = options.categoryId;
  if (options?.status) where.status = options.status;
  if (options?.search) {
    where.OR = [
      { name: { contains: options.search } },
      { sku: { contains: options.search } },
    ];
  }

  return prisma.product.findMany({
    where: where as any,
    include: { category: true },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
    skip: options?.offset ?? 0,
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
}

export async function createProduct(input: CreateProductInput) {
  return prisma.product.create({
    data: {
      name: input.name,
      sku: input.sku,
      categoryId: input.categoryId,
      bio: input.bio ?? null,
      imageUrls: input.imageUrls ? JSON.stringify(input.imageUrls) : null,
      price: input.price,
      costPrice: input.costPrice,
      stock: input.stock,
      status: input.status ?? 'active',
      showOnLanding: input.showOnLanding ?? false,
      showOnExtraLanding: input.showOnExtraLanding ?? false,
      showOnSecondaryLanding: input.showOnSecondaryLanding ?? false,
    },
    include: { category: true },
  });
}

export async function updateProduct(id: string, input: Partial<CreateProductInput>) {
  const data: Record<string, unknown> = { ...input };
  if (input.imageUrls) {
    data.imageUrls = JSON.stringify(input.imageUrls);
  }
  return prisma.product.update({
    where: { id },
    data: data as any,
    include: { category: true },
  });
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({ where: { id } });
}
