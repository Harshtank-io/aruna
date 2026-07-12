import assert from 'node:assert/strict';

import { scoutingFormSchema } from '../src/lib/schemas/scouting';

const valid = scoutingFormSchema.safeParse({
  locationName: 'Joshua Tree Ridge',
  latitude: 34.0123,
  longitude: -116.168,
  tags: ['Landscape', 'Astro'],
});

assert.equal(valid.success, true);

const invalid = scoutingFormSchema.safeParse({
  locationName: '',
  latitude: 200,
  longitude: 0,
  tags: [],
});

assert.equal(invalid.success, false);
console.log('scouting schema check ok');
