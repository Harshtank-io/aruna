import assert from 'node:assert/strict';

import { fetchNearbyPhotos } from '../src/lib/fetch-nearby-photos';

async function main() {
  const photos = await fetchNearbyPhotos(34.0118, -116.166, 4, 'Joshua Tree');
  assert.ok(photos.length > 0, 'expected nearby photos for Joshua Tree');
  assert.ok(photos[0].thumbUrl.startsWith('http'), 'thumbUrl should be http');
  console.log(
    'photos check ok:',
    photos.length,
    photos.map((p) => p.title.slice(0, 40)),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
