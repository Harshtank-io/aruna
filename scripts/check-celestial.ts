import assert from 'node:assert/strict';

import {
  azimuthToCompassDeg,
  bearingLabel,
  destinationPoint,
  getScoutLight,
} from '../src/lib/celestial';
import { buildShotExamples } from '../src/lib/shot-examples';

// South-facing SunCalc azimuth 0 → compass 180° (south)
assert.equal(Math.round(azimuthToCompassDeg(0)), 180);
assert.equal(bearingLabel(0), 'N');
assert.equal(bearingLabel(90), 'E');

const tip = destinationPoint(0, 0, 90, 111.2);
assert.ok(Math.abs(tip.latitude) < 1);
assert.ok(tip.longitude > 0.9 && tip.longitude < 1.1);

const light = getScoutLight(34.0118, -116.166); // Joshua Tree-ish
assert.ok(!Number.isNaN(light.sunrise.getTime()));
assert.ok(light.sunset.getTime() > light.sunrise.getTime());

const examples = buildShotExamples(light, ['Landscape', 'Astro'], 'Joshua Tree');
assert.ok(examples.length >= 2);
assert.ok(examples.some((item) => item.tag === 'Astro'));

console.log('celestial + shot-examples check ok');
