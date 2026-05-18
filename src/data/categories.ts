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
    countLabel: '24 items',
    description: 'Wireless, studio, gaming, and travel headphones curated for rich and clear sound.',
    products: [
      {
        name: 'AirPods Max',
        price: '559.00',
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1517420879524-86d64ac2f339?auto=format&fit=crop&w=900&q=80',
        description: 'High-fidelity over-ear sound with premium comfort.',
      },
      {
        name: 'JBL Tune 600BTNC',
        price: '59.00',
        image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1518441902117-f0a6b05d3f7a?auto=format&fit=crop&w=900&q=80',
        description: 'Noise-cancelling wireless headphones with deep bass.',
      },
      {
        name: 'Monster NMFLEX',
        price: '89.75',
        image: 'https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=900&q=80',
        description: 'Flexible active noise cancellation for daily use.',
      },
      {
        name: 'Mpow CH6',
        price: '569.00',
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
        description: 'Kid-safe padded design with long listening comfort.',
      },
    ],
  },
  {
    slug: 'earbuds',
    name: 'Earbuds',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80',
    countLabel: '18 items',
    description: 'Compact true wireless earbuds for calls, workouts, and all-day listening.',
    products: [
      {
        name: 'Wireless Earbuds PX8',
        price: '89.00',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1518441902117-f0a6b05d3f7a?auto=format&fit=crop&w=900&q=80',
        description: 'Lightweight earbuds with balanced sound and quick pairing.',
      },
      {
        name: 'TAGRY Bluetooth',
        price: '109.00',
        image: 'https://images.unsplash.com/photo-1609869503572-ec6f8f24f5c2?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80',
        description: 'Pocket charging case and strong battery backup.',
      },
      {
        name: 'Bose BT Earphones',
        price: '289.00',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80',
        description: 'Clean detail and premium comfort in-ear design.',
      },
    ],
  },
  {
    slug: 'speakers',
    name: 'Speakers',
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80',
    countLabel: '14 items',
    description: 'Portable and home speakers that deliver room-filling clarity and bass.',
    products: [
      {
        name: 'Pulse Portable Speaker',
        price: '129.00',
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=900&q=80',
        description: 'Portable wireless speaker with bold bass response.',
      },
      {
        name: 'Studio Mini Speaker',
        price: '169.00',
        image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80',
        description: 'Compact design for desks and small rooms.',
      },
      {
        name: 'Home Beat Bar',
        price: '249.00',
        image: 'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80',
        description: 'Wide stereo field for movies and playlists.',
      },
    ],
  },
  {
    slug: 'gaming-audio',
    name: 'Gaming Audio',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80',
    countLabel: '12 items',
    description: 'Immersive gaming headsets and mics for precision and long sessions.',
    products: [
      {
        name: 'VIVEFOX Gaming Headset',
        price: '39.00',
        image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80',
        description: 'Wired stereo headset with crystal-clear microphone.',
      },
      {
        name: 'Arena Pro RGB Headset',
        price: '79.00',
        image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80',
        description: 'Low-latency audio and directional game sound.',
      },
      {
        name: 'Strike Voice Mic',
        price: '49.00',
        image: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=900&q=80',
        hoverImage: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80',
        description: 'Noise-suppressed voice pickup for team chat.',
      },
    ],
  },
];

export const landingCategories: CategoryCard[] = categoryDetails.map((category) => ({
  slug: category.slug,
  name: category.name,
  image: category.image,
  countLabel: category.countLabel,
}));
