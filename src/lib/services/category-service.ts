import 'server-only';
import prisma from '../db';

export type CreateCategoryInput = {
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
};

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true } } },
  });
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: { products: true },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: { products: true },
  });
}

export async function createCategory(input: CreateCategoryInput) {
  return prisma.category.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateCategory(id: string, input: Partial<CreateCategoryInput>) {
  return prisma.category.update({
    where: { id },
    data: input as any,
  });
}

export async function deleteCategory(id: string) {
  return prisma.category.delete({ where: { id } });
}
