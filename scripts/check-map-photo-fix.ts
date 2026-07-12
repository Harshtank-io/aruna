import assert from 'node:assert/strict';

import { forwardGeocodeLocation } from '../src/app/actions/reverse-geocode';
import { needsCoordinateLookup } from '../src/lib/coords';
import { fetchInspirationPhotos } from '../src/lib/fetch-nearby-photos';

async function main() {
  assert.equal(needsCoordinateLookup(0, 0), true);
  assert.equal(needsCoordinateLookup(30.08, 78.26), false);

  const place = await forwardGeocodeLocation('Rishikesh');
  assert.equal(place.ok, true);
  if (!place.ok) {
    return;
  }
  assert.ok(place.latitude > 29 && place.latitude < 31);
  assert.ok(place.longitude > 77 && place.longitude < 80);

  const photos = await fetchInspirationPhotos({
    locationName: 'Rishikesh',
    tags: ['Landscape'],
    latitude: place.latitude,
    longitude: place.longitude,
    limit: 6,
  });
  assert.ok(photos.length > 0, 'expected Rishikesh photos');
  assert.ok(
    photos.some((p) => /rishikesh|ganges|ganga/i.test(p.title)),
    `expected place-related titles, got ${photos.map((p) => p.title).join(' | ')}`,
  );

  console.log('map+photo fix confirmation ok');
  console.log({
    lat: place.latitude,
    lng: place.longitude,
    photos: photos.map((p) => `${p.match}:${p.title.slice(0, 40)}`),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
