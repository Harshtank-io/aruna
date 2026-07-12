'use server';

export type ReverseGeocodeResult =
  | {
      ok: true;
      displayName: string;
    }
  | {
      ok: false;
      error: string;
    };

export type ForwardGeocodeResult =
  | {
      ok: true;
      latitude: number;
      longitude: number;
      displayName: string;
    }
  | {
      ok: false;
      error: string;
    };

const USER_AGENT = 'ArunaPhotographerScout/0.1 (hackathon)';

/** Nominatim reverse geocode — no API key; keep usage light. */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { ok: false, error: 'Invalid coordinates.' };
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'json');
    url.searchParams.set('zoom', '14');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return { ok: false, error: 'Place lookup failed.' };
    }

    const data = (await response.json()) as {
      name?: string;
      display_name?: string;
      address?: {
        tourism?: string;
        leisure?: string;
        natural?: string;
        peak?: string;
        suburb?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
      };
    };

    const address = data.address;
    const short =
      address?.tourism ||
      address?.leisure ||
      address?.natural ||
      address?.peak ||
      data.name ||
      [address?.suburb, address?.city || address?.town || address?.village]
        .filter(Boolean)
        .join(', ') ||
      data.display_name?.split(',').slice(0, 3).join(',').trim();

    if (!short) {
      return { ok: false, error: 'No place name found.' };
    }

    return { ok: true, displayName: short };
  } catch {
    return { ok: false, error: 'Place lookup unavailable.' };
  }
}

/** Nominatim forward geocode — resolve typed place names to coordinates. */
export async function forwardGeocodeLocation(
  query: string,
): Promise<ForwardGeocodeResult> {
  const cleaned = query.trim();
  if (cleaned.length < 2) {
    return { ok: false, error: 'Place name too short.' };
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', cleaned);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return { ok: false, error: 'Place search failed.' };
    }

    const data = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      name?: string;
    }>;

    const hit = data[0];
    const latitude = Number(hit?.lat);
    const longitude = Number(hit?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, error: `Could not find "${cleaned}" on the map.` };
    }

    const displayName =
      hit.name ||
      hit.display_name?.split(',').slice(0, 3).join(',').trim() ||
      cleaned;

    return {
      ok: true,
      latitude: Number(latitude.toFixed(5)),
      longitude: Number(longitude.toFixed(5)),
      displayName,
    };
  } catch {
    return { ok: false, error: 'Place search unavailable.' };
  }
}
