import { generateJsonWithPool } from '@/lib/gemini-pool';
import { PHOTOGRAPHY_TAGS } from '@/types/scouting';
import type { LocationPhoto, PhotographyTag } from '@/types/scouting';

export type { LocationPhoto };

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const OPENVERSE = 'https://api.openverse.org/v1/images/';

const TAG_KEYWORDS: Record<PhotographyTag, string[]> = {
  Landscape: ['landscape', 'golden hour', 'vista', 'sunrise sunset'],
  Astro: ['night sky', 'milky way', 'astrophotography', 'star trail'],
  Street: ['street photography', 'city street night'],
  Portrait: ['portrait photography', 'environmental portrait'],
  Wildlife: ['wildlife photography', 'birds animals nature'],
};

const TAG_INSPIRE: Record<PhotographyTag, string> = {
  Landscape: 'Match this framing at golden hour — strong foreground, clean horizon.',
  Astro: 'Recreate after astronomical dark: wide lens, tripod, 15–20s, ISO 1600–3200.',
  Street: 'Hunt side-light and leading lines; expose for highlights, wait for a subject.',
  Portrait: 'Use rim/backlight like this; open shade or golden hour for skin tones.',
  Wildlife: 'Get low to eye level; fast shutter; patient approach from a respectful distance.',
};

interface ImageInfo {
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
  extmetadata?: {
    Artist?: { value?: string };
    LicenseShortName?: { value?: string };
  };
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

function uniqueQueries(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

/** Infer nearby photography regions when exact location+tag stock is thin. */
export function inferPhotoRegions(locationName: string): string[] {
  const name = locationName.toLowerCase();
  const regions: string[] = [];

  if (
    /kuari|joshimath|chamoli|garhwal|auli|tungnath|chopta|kedarnath|badrinath|uttarakhand|rishikesh|haridwar|mussoorie|dehradun/.test(
      name,
    )
  ) {
    regions.push('Garhwal Himalaya', 'Uttarakhand Himalaya', 'Himalaya');
  } else if (/ladakh|leh|pangong|nubra|spiti|manali|rohtang|kashmir/.test(name)) {
    regions.push('Ladakh', 'Himalaya');
  } else if (/himalaya|pass|trek|nepal|sikkim|bhutan/.test(name)) {
    regions.push('Himalaya');
  } else if (/rajasthan|jaisalmer|jodhpur|thar/.test(name)) {
    regions.push('Rajasthan desert');
  } else if (/goa|kerala|beach|gokarna/.test(name)) {
    regions.push('India coastline');
  }

  if (regions.length === 0 && name.split(/\s+/).length <= 4) {
    regions.push(locationName.trim());
  }

  return uniqueQueries(regions);
}

function isJunkTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    /\.(pdf|djvu|webm|svg|stl|ogg|ogv)(\s|$)/i.test(title) ||
    /clevelandart|tourmaline|albite|sculpture|goddess|manuscript|encyclopaedia|geological survey|medicinal plants|memoirs of/i.test(
      lower,
    )
  );
}

function titleLooksLikeAstro(title: string): boolean {
  return /(milky ?way|star|night|astro|galaxy|nebula|aurora|constellation|moon)/i.test(
    title,
  );
}

function titleMentionsPlace(title: string, locationName: string): boolean {
  const hay = title.toLowerCase();
  const tokens = locationName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  if (tokens.length === 0) {
    return false;
  }
  return tokens.some((token) => hay.includes(token));
}

function scorePhoto(
  photo: LocationPhoto,
  locationName: string,
  tags: PhotographyTag[],
  regions: string[] = [],
): number {
  const hay = `${photo.title} ${photo.credit}`.toLowerCase();
  const place = locationName.toLowerCase();
  const placeTokens = place.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  let score = 0;

  if (place && hay.includes(place)) {
    score += 50;
  }
  for (const token of placeTokens) {
    if (hay.includes(token)) {
      score += 12;
    }
  }

  // Same-region style shots beat generic ones (Himalaya astro > Norway astro)
  const regionTokens = regions
    .flatMap((region) => region.toLowerCase().split(/[^a-z0-9]+/))
    .filter((token) => token.length > 3);
  if (regionTokens.some((token) => hay.includes(token))) {
    score += 18;
  }

  for (const tag of tags) {
    for (const keyword of TAG_KEYWORDS[tag]) {
      if (hay.includes(keyword.toLowerCase())) {
        score += 20;
      }
    }
    if (tag === 'Astro' && /(milky|star|night sky|astro|galaxy)/i.test(hay)) {
      score += 25;
    }
  }

  if (photo.match === 'location-tag') {
    score += 40;
  } else if (photo.match === 'location') {
    score += 25;
  } else if (photo.match === 'region-tag') {
    score += 15;
  }

  return score;
}

async function commonsSearchTitles(query: string, limit: number): Promise<string[]> {
  const url = new URL(COMMONS);
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  // filetype:bitmap drops the PDF/djvu book scans that dominate broad region queries
  url.searchParams.set('srsearch', `${query} filetype:bitmap`);
  url.searchParams.set('srnamespace', '6');
  url.searchParams.set('srlimit', String(limit));
  url.searchParams.set('format', 'json');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'ArunaPhotographerScout/0.1 (hackathon)' },
    cache: 'no-store',
  });
  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as {
    query?: { search?: Array<{ title: string }> };
  };

  return (json.query?.search ?? [])
    .map((item) => item.title)
    .filter((title) => !isJunkTitle(title));
}

async function commonsImageInfo(titles: string[]): Promise<LocationPhoto[]> {
  if (titles.length === 0) {
    return [];
  }

  const infoUrl = new URL(COMMONS);
  infoUrl.searchParams.set('action', 'query');
  infoUrl.searchParams.set('titles', titles.join('|'));
  infoUrl.searchParams.set('prop', 'imageinfo');
  infoUrl.searchParams.set('iiprop', 'url|extmetadata|size');
  infoUrl.searchParams.set('iiurlwidth', '640');
  infoUrl.searchParams.set('format', 'json');

  const response = await fetch(infoUrl, {
    headers: { 'User-Agent': 'ArunaPhotographerScout/0.1 (hackathon)' },
    cache: 'no-store',
  });
  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        { pageid: number; title: string; imageinfo?: ImageInfo[] }
      >;
    };
  };

  const pages = Object.values(json.query?.pages ?? {});
  const photos: LocationPhoto[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const thumb = info?.thumburl || info?.url;
    if (!thumb || isJunkTitle(page.title)) {
      continue;
    }
    const artist = info?.extmetadata?.Artist?.value
      ? stripHtml(info.extmetadata.Artist.value)
      : 'Wikimedia Commons';
    const license = info?.extmetadata?.LicenseShortName?.value ?? '';
    photos.push({
      id: `commons-${page.pageid}`,
      title: stripHtml(page.title.replace(/^File:/, '')),
      thumbUrl: thumb,
      fullUrl: info?.url || thumb,
      pageUrl:
        info?.descriptionurl ||
        `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      credit: license ? `${artist} · ${license}` : artist,
      match: 'location',
      inspireTip: 'Use this as a location reference for composition and terrain.',
    });
  }
  return photos;
}

async function openverseSearch(
  query: string,
  limit: number,
): Promise<LocationPhoto[]> {
  const url = new URL(OPENVERSE);
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', String(Math.min(limit, 20)));
  url.searchParams.set('license_type', 'commercial,modification');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ArunaPhotographerScout/0.1 (hackathon)',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    results?: Array<{
      id: string;
      title: string;
      url: string;
      thumbnail?: string;
      foreign_landing_url?: string;
      creator?: string;
      license?: string;
    }>;
  };

  return (data.results ?? []).slice(0, limit).map((item) => ({
    id: `ov-${item.id}`,
    title: item.title || query,
    thumbUrl: item.thumbnail || item.url,
    fullUrl: item.url,
    pageUrl: item.foreign_landing_url || item.url,
    credit:
      [item.creator, item.license].filter(Boolean).join(' · ') || 'Openverse',
    match: 'location' as const,
    inspireTip: 'Study light and framing, then adapt to your pin.',
  }));
}

async function searchQuery(
  query: string,
  limit: number,
): Promise<LocationPhoto[]> {
  const [commonsTitlesResult, openverseResult] = await Promise.allSettled([
    commonsSearchTitles(query, limit),
    openverseSearch(query, limit),
  ]);

  const titles =
    commonsTitlesResult.status === 'fulfilled' ? commonsTitlesResult.value : [];
  const openverse =
    openverseResult.status === 'fulfilled' ? openverseResult.value : [];

  let commons: LocationPhoto[] = [];
  try {
    commons = await commonsImageInfo(titles.slice(0, limit));
  } catch {
    commons = [];
  }

  console.log(
    `[photos] "${query}" commons=${commons.length} openverse=${openverse.length}`,
  );
  return [...commons, ...openverse];
}

function decoratePhoto(
  photo: LocationPhoto,
  match: LocationPhoto['match'],
  tag: PhotographyTag | undefined,
  locationName: string,
): LocationPhoto {
  const tip = tag
    ? TAG_INSPIRE[tag]
    : `Scout how this frame sits in the terrain at ${locationName}.`;

  return {
    ...photo,
    match,
    tag,
    inspireTip:
      match === 'location-tag'
        ? `${tag} at ${locationName}: ${tip}`
        : match === 'region-tag'
          ? `Same-region ${tag} inspiration near ${locationName}: ${tip}`
          : match === 'location'
            ? `Location reference for ${locationName}: note ridges, access, and foreground.`
            : tip,
  };
}

export interface InspirationPhotoInput {
  locationName: string;
  tags: PhotographyTag[];
  latitude?: number;
  longitude?: number;
  limit?: number;
}

interface QueryPlan {
  locationQueries: string[];
  styleQueries: Array<{ tag: PhotographyTag; queries: string[] }>;
}

function isQueryPlan(value: unknown): value is QueryPlan {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const plan = value as Partial<QueryPlan>;
  return (
    Array.isArray(plan.locationQueries) &&
    plan.locationQueries.every((q) => typeof q === 'string') &&
    Array.isArray(plan.styleQueries) &&
    plan.styleQueries.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.tag === 'string' &&
        Array.isArray(entry.queries) &&
        entry.queries.every((q) => typeof q === 'string'),
    )
  );
}

/** Static plan when Gemini is unavailable — location name + regex-inferred region. */
function staticQueryPlan(
  locationName: string,
  tags: PhotographyTag[],
): QueryPlan {
  const regions = inferPhotoRegions(locationName);
  return {
    locationQueries: uniqueQueries([
      locationName,
      regions[0] ? `${locationName} ${regions[0]}` : '',
    ]),
    styleQueries: tags.map((tag) => ({
      tag,
      queries: uniqueQueries(
        [regions[0], regions[1]]
          .filter((region): region is string => Boolean(region))
          .flatMap((region) => [
            `${region} ${TAG_KEYWORDS[tag][0]}`,
            `${region} ${TAG_KEYWORDS[tag][1] ?? TAG_KEYWORDS[tag][0]}`,
          ])
          .concat(`${TAG_KEYWORDS[tag][0]} mountains`),
      ).slice(0, 3),
    })),
  };
}

/**
 * Gemini turns "Kuari Pass" + Astro into archive-friendly queries like
 * "Uttarakhand night sky" — it knows the geography; CC archives only match titles.
 */
async function buildQueryPlan(
  locationName: string,
  tags: PhotographyTag[],
  latitude?: number,
  longitude?: number,
): Promise<QueryPlan> {
  const coords =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? ` (coordinates ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
      : '';

  const prompt = [
    'You generate photo search queries for Wikimedia Commons and Openverse — Creative Commons photo archives that only match words in photo titles/descriptions.',
    `Scouting location: "${locationName}"${coords}.`,
    `Photography styles wanted: ${tags.join(', ')}.`,
    '',
    'Rules:',
    '- Each query is 2–4 plain words, no punctuation or quotes.',
    '- "locationQueries": 2 queries — the place itself, and the place with its state/country.',
    '- "styleQueries": for each style, 3 queries pairing well-known nearby regions, ranges, towns, or landmarks (use your geographic knowledge of this location) with words photographers put in titles.',
    '- Style words — Astro: night sky, milky way, star trail, stars. Landscape: landscape, valley, peak, sunrise. Street: street, market, bazaar. Portrait: portrait, people. Wildlife: wildlife, bird, animal.',
    '- Prefer broader famous areas over the exact spot for styleQueries (archives rarely have niche-spot style shots).',
    '',
    `Return JSON only: {"locationQueries": ["...", "..."], "styleQueries": [{"tag": "<one of: ${tags.join(', ')}>", "queries": ["...", "...", "..."]}]}`,
  ].join('\n');

  const plan = await generateJsonWithPool(prompt, isQueryPlan);
  if (!plan) {
    return staticQueryPlan(locationName, tags);
  }

  const validTags = new Set<string>(PHOTOGRAPHY_TAGS);
  return {
    locationQueries: uniqueQueries(
      [...plan.locationQueries, locationName].filter(Boolean),
    ).slice(0, 3),
    styleQueries: tags.map((tag) => {
      const entry = plan.styleQueries.find(
        (item) => validTags.has(item.tag) && item.tag === tag,
      );
      const fallback = staticQueryPlan(locationName, [tag]).styleQueries[0]!;
      return {
        tag,
        queries: uniqueQueries(entry?.queries ?? fallback.queries).slice(0, 3),
      };
    }),
  };
}

/**
 * Location + tag inspiration photos (not raw geotags).
 * Exact location+style first, then location refs, then same-region style.
 */
export async function fetchInspirationPhotos(
  input: InspirationPhotoInput,
): Promise<LocationPhoto[]> {
  const locationName = input.locationName.trim();
  const tags = input.tags.length > 0 ? input.tags : (['Landscape'] as PhotographyTag[]);
  const limit = input.limit ?? 8;
  const regions = inferPhotoRegions(locationName);

  try {
    const collected: LocationPhoto[] = [];
    const seen = new Set<string>();

    const pushAll = (
      photos: LocationPhoto[],
      match: LocationPhoto['match'],
      tag?: PhotographyTag,
    ) => {
      for (const photo of photos) {
        const key = photo.thumbUrl || photo.id;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        collected.push(decoratePhoto(photo, match, tag, locationName));
      }
    };

    const plan = await buildQueryPlan(
      locationName,
      tags,
      input.latitude,
      input.longitude,
    );
    console.log('[photos] query plan', JSON.stringify(plan));

    const jobs: Array<Promise<void>> = [];

    // Exact place + style — often empty for niche spots, gold when it hits
    for (const tag of tags) {
      jobs.push(
        searchQuery(`${locationName} ${TAG_KEYWORDS[tag][0]}`, 5).then(
          (photos) => pushAll(photos, 'location-tag', tag),
        ),
      );
    }

    for (const query of plan.locationQueries) {
      jobs.push(
        searchQuery(query, 6).then((photos) => pushAll(photos, 'location')),
      );
    }

    for (const entry of plan.styleQueries) {
      for (const query of entry.queries) {
        jobs.push(
          searchQuery(query, 6).then((photos) =>
            pushAll(photos, 'region-tag', entry.tag),
          ),
        );
      }
    }

    await Promise.allSettled(jobs);

    // Guarantee tag-style frames even when location has no CC night shots
    for (const tag of tags) {
      const tagStyleCount = collected.filter(
        (photo) =>
          (photo.match === 'location-tag' || photo.match === 'region-tag') &&
          photo.tag === tag &&
          (tag !== 'Astro' || titleLooksLikeAstro(photo.title)),
      ).length;
      if (tagStyleCount >= 2) {
        continue;
      }

      // Region-anchored first, generic style only as last resort
      const fallbackQueries = uniqueQueries(
        [
          regions[0] && `${regions[0]} ${TAG_KEYWORDS[tag][0]}`,
          regions[1] && `${regions[1]} ${TAG_KEYWORDS[tag][0]}`,
          regions[0] && `${regions[0]} ${TAG_KEYWORDS[tag][1] ?? ''}`,
          TAG_KEYWORDS[tag][0],
        ].filter((query): query is string => Boolean(query)),
      ).slice(0, 4);

      for (const query of fallbackQueries) {
        const photos = await searchQuery(query.trim(), 6);
        console.log(`[photos] fallback "${query}" -> ${photos.length}`);
        pushAll(photos, 'region-tag', tag);
      }
    }

    const relevant = collected.filter((photo) => {
      if (isJunkTitle(photo.title)) {
        return false;
      }
      if (photo.match === 'location') {
        return titleMentionsPlace(photo.title, locationName);
      }
      if (photo.match === 'location-tag') {
        return (
          titleMentionsPlace(photo.title, locationName) ||
          (photo.tag === 'Astro' && titleLooksLikeAstro(photo.title))
        );
      }
      if (photo.match === 'region-tag' && photo.tag === 'Astro') {
        return titleLooksLikeAstro(photo.title);
      }
      // Other region-tag styles: Gemini queries already carry the style words;
      // scoring ranks the best matches, so don't over-filter thin archives.
      return true;
    });

    const scored = relevant
      .map((photo) => ({
        photo,
        score: scorePhoto(photo, locationName, tags, regions),
      }))
      .sort((a, b) => b.score - a.score);
    console.log(
      '[photos] ranked',
      JSON.stringify(
        scored.map((s) => `${s.score} ${s.photo.match} ${s.photo.title}`),
        null,
        1,
      ),
    );
    console.log(
      '[photos] dropped',
      JSON.stringify(
        collected
          .filter((p) => !relevant.includes(p))
          .map((p) => `${p.match} ${p.title}`),
        null,
        1,
      ),
    );
    const ranked = scored.map((entry) => entry.photo);

    // Force a guided mix: place frames + style frames
    const locationTag = ranked
      .filter((p) => p.match === 'location-tag')
      .slice(0, 3);
    const locationRefs = ranked.filter((p) => p.match === 'location').slice(0, 3);
    const regionTag = ranked.filter((p) => p.match === 'region-tag').slice(0, 4);
    const mixed = [...locationTag, ...locationRefs, ...regionTag];
    const deduped: LocationPhoto[] = [];
    const ids = new Set<string>();
    for (const photo of mixed) {
      if (ids.has(photo.id)) {
        continue;
      }
      ids.add(photo.id);
      deduped.push(photo);
      if (deduped.length >= limit) {
        break;
      }
    }

    return deduped;
  } catch (error) {
    console.error('[photos] fetchInspirationPhotos failed', error);
    return [];
  }
}

/** @deprecated use fetchInspirationPhotos — kept for older imports */
export async function fetchNearbyPhotos(
  latitude: number,
  longitude: number,
  limit = 6,
  locationName?: string,
  tags: PhotographyTag[] = [],
): Promise<LocationPhoto[]> {
  return fetchInspirationPhotos({
    locationName: locationName || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
    tags,
    latitude,
    longitude,
    limit,
  });
}
