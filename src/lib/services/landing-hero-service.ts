import 'server-only';
import prisma from '../db';

export type LandingHeroInput = {
  title: string;
  buttonText: string;
  buttonHref?: string;
  imageUrl: string;
  backgroundColor?: string;
  overlayOpacity?: number;
};

export async function getLandingHero() {
  try {
    return await prisma.landingHeroSetting.findUnique({
      where: { id: 'default' },
    });
  } catch {
    return null;
  }
}

export async function upsertLandingHero(input: LandingHeroInput) {
  return prisma.landingHeroSetting.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      title: input.title,
      buttonText: input.buttonText,
      buttonHref: input.buttonHref ?? '#grid',
      imageUrl: input.imageUrl,
      backgroundColor: input.backgroundColor ?? '#f4ede3',
      overlayOpacity: input.overlayOpacity ?? 82,
    },
    update: {
      title: input.title,
      buttonText: input.buttonText,
      buttonHref: input.buttonHref ?? '#grid',
      imageUrl: input.imageUrl,
      backgroundColor: input.backgroundColor ?? '#f4ede3',
      overlayOpacity: input.overlayOpacity ?? 82,
    },
  });
}
