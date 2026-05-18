import { defaultLandingHeroSettings } from './catalog-store';
import { landingCategories } from '../data/categories';

export const seedProductCards = [
  {
    name: 'Wireless Earbuds, PX8',
    price: '89.00',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1518441902117-f0a6b05d3f7a?auto=format&fit=crop&w=800&q=80',
    caption: 'Organic cotton, fantastic comfort',
  },
  {
    name: 'AirPods Max',
    price: '559.00',
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1517420879524-86d64ac2f339?auto=format&fit=crop&w=800&q=80',
    caption: 'A perfect balance of high-fidelity audio',
  },
  {
    name: 'Bose BT Earphones',
    price: '289.00',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    caption: 'Table with air purifier, stained wooden black',
  },
  {
    name: 'VIVEFOX Headphones',
    price: '39.00',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=80',
    caption: 'Wired Stereo Headsets With Mic',
  },
  {
    name: 'JBL TUNE 600BTNC',
    price: '59.00',
    image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    caption: 'Premium bass and noise control',
  },
  {
    name: 'TAGRY Bluetooth',
    price: '109.00',
    image: 'https://images.unsplash.com/photo-1609869503572-ec6f8f24f5c2?auto=format&fit=crop&w=800&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    caption: 'USB, one charge, Bluetooth case',
  },
  {
    name: 'Monster NMFLEX',
    price: '89.75',
    image: 'https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=800&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=800&q=80',
    caption: 'Flex active noise cancelling bluetooth',
  },
  {
    name: 'Mpow CH6',
    price: '569.00',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    caption: 'Kids headphones with soft pads',
  },
];

export const buildSeedCatalog = () => {
  const now = new Date().toISOString();
  const categories = landingCategories.map((c) => ({ id: c.slug, slug: c.slug, name: c.name, description: '', imageUrl: c.image, isActive: true, createdAt: now }));

  const products = seedProductCards.map((p, idx) => ({
    id: `seed-prd-${idx}-${Date.now()}`,
    name: p.name,
    sku: `SKU-${String(idx + 1).padStart(3, '0')}`,
    categoryId: categories[idx % categories.length]?.id ?? categories[0]?.id ?? 'uncat',
    bio: p.caption,
    imageUrls: [p.image, p.hoverImage].filter(Boolean),
    price: Number(p.price),
    costPrice: 0,
    stock: 10,
    status: 'active',
    showOnLanding: true,
    showOnExtraLanding: false,
    showOnSecondaryLanding: false,
    createdAt: now,
    updatedAt: now,
  }));

  const list = { id: 'seed-list-1', name: 'Imported Landing', productIds: products.map((p) => p.id), createdAt: now };

  return { categories, products, lists: [list], selectedListId: list.id, hero: defaultLandingHeroSettings };
};
