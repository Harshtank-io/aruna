import assert from 'node:assert/strict';

import {
  fetchInspirationPhotos,
  inferPhotoRegions,
} from '../src/lib/fetch-nearby-photos';

async function main() {
  const regions = inferPhotoRegions('Kuari Pass');
  assert.ok(regions.some((r) => /himalaya|garhwal|uttarakhand/i.test(r)));

  const photos = await fetchInspirationPhotos({
    locationName: 'Kuari Pass',
    tags: ['Astro'],
    latitude: 30.458,
    longitude: 79.55,
    limit: 8,
  });

  assert.ok(photos.length > 0, 'expected inspiration photos');

  const locationShots = photos.filter(
    (p) => p.match === 'location' || /kuari/i.test(p.title),
  );
  const astroShots = photos.filter(
    (p) =>
      (p.tag === 'Astro' || p.match === 'region-tag' || p.match === 'location-tag') &&
      /(milky|star|night|astro|galaxy)/i.test(p.title),
  );

  assert.ok(
    locationShots.length > 0,
    `expected Kuari Pass location frames, got: ${photos.map((p) => p.title).join(' | ')}`,
  );
  assert.ok(
    astroShots.length > 0,
    `expected milky-way/astro frames, got: ${photos.map((p) => p.title).join(' | ')}`,
  );

  const junk = photos.filter((p) =>
    /cleveland|tourmaline|goddess|albite|sculpture/i.test(p.title),
  );
  assert.equal(junk.length, 0, `junk leaked: ${junk.map((p) => p.title)}`);

  console.log('FINAL CONFIRMATION: Kuari Pass + Astro photo search OK');
  console.log(
    photos.map((p) => ({
      match: p.match,
      tag: p.tag,
      title: p.title.slice(0, 56),
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
