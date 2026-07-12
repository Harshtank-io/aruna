export const PHOTOGRAPHY_TAGS = [
  'Landscape',
  'Astro',
  'Street',
  'Portrait',
  'Wildlife',
] as const;

export type PhotographyTag = (typeof PHOTOGRAPHY_TAGS)[number];

export interface ScoutingLocation {
  locationName: string;
  latitude: number;
  longitude: number;
  tags: PhotographyTag[];
}

export type BriefingResult =
  | {
      ok: true;
      markdown: string;
      photos: LocationPhoto[];
      latitude: number;
      longitude: number;
      locationName: string;
    }
  | { ok: false; error: string };

export interface LocationPhoto {
  id: string;
  title: string;
  thumbUrl: string;
  fullUrl: string;
  pageUrl: string;
  credit: string;
  /** How this photo relates to the scout request */
  match?: 'location-tag' | 'location' | 'region-tag' | 'style';
  tag?: PhotographyTag;
  /** How to recreate / get inspired by this frame */
  inspireTip?: string;
}
