/** Canonical production URL — override with NEXT_PUBLIC_SITE_URL when needed. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  'https://aruna-light.vercel.app';

export const SITE_NAME = 'Aruna';

export const SITE_TAGLINE = 'Maps for Photographers';

export const SITE_DESCRIPTION =
  'Pin a place, read the light, and shoot the frame — location scouting built for photographers. Golden hour, sun angle, and AI briefings for every pin.';

export const SITE_KEYWORDS = [
  'photography scouting',
  'golden hour calculator',
  'sun angle map',
  'photo location planner',
  'blue hour',
  'landscape photography',
  'astro photography planning',
  'Aruna',
] as const;
