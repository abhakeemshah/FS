import { categoryDetails } from '../../../data/categories';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CategoryPageProps = {
  params: {
    slug: string;
  };
};

export async function generateStaticParams() {
  return categoryDetails.map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug?.trim();

  if (!slug) {
    redirect('/categories');
  }

  redirect(`/categories#${slug}`);
}
