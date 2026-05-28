export type CategoryCard = {
  slug: string;
  name: string;
  image: string;
  countLabel: string;
};

export type CategoryProduct = {
  name: string;
  price: string;
  image: string;
  hoverImage: string;
  description: string;
};

export type CategoryDetail = CategoryCard & {
  description: string;
  products: CategoryProduct[];
};

export const categoryDetails: CategoryDetail[] = [
  {
    slug: 'headphones',
    name: 'Headphones',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    countLabel: '0 items',
    description: 'Wireless, studio, gaming, and travel headphones curated for rich and clear sound.',
    products: [],
  },
  {
    slug: 'earbuds',
    name: 'Earbuds',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80',
    countLabel: '0 items',
    description: 'Compact true wireless earbuds for calls, workouts, and all-day listening.',
    products: [],
  },
  {
    slug: 'speakers',
    name: 'Speakers',
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80',
    countLabel: '0 items',
    description: 'Portable and home speakers that deliver room-filling clarity and bass.',
    products: [],
  },
  {
    slug: 'gaming-audio',
    name: 'Gaming Audio',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80',
    countLabel: '0 items',
    description: 'Immersive gaming headsets and mics for precision and long sessions.',
    products: [],
  },
];

export const landingCategories: CategoryCard[] = categoryDetails.map((category) => ({
  slug: category.slug,
  name: category.name,
  image: category.image,
  countLabel: category.countLabel,
}));
