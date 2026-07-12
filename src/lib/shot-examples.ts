import {
  formatClock,
  formatWindow,
  type ScoutLight,
} from '@/lib/celestial';
import type { PhotographyTag } from '@/types/scouting';

export interface ShotExample {
  tag: PhotographyTag | 'General';
  title: string;
  when: string;
  angle: string;
  tip: string;
}

export function buildShotExamples(
  light: ScoutLight,
  tags: PhotographyTag[],
  locationName: string,
): ShotExample[] {
  const place = locationName.trim() || 'this spot';
  const active = tags.length > 0 ? tags : (['Landscape'] as PhotographyTag[]);
  const examples: ShotExample[] = [];

  for (const tag of active) {
    switch (tag) {
      case 'Landscape':
        examples.push({
          tag,
          title: `Warm ridge light at ${place}`,
          when: formatWindow(light.goldenEvening),
          angle: `Face ${light.antiSunBearingLabel} (sun behind you from ${light.sunBearingLabel})`,
          tip: 'Use a foreground rock or path as lead-in; keep the horizon ⅓ up for sky color.',
        });
        examples.push({
          tag,
          title: 'Side-lit texture pass',
          when: formatWindow(light.goldenMorning),
          angle: `Shoot toward ${bearingQuarter(light.sunAzimuthDeg)} for raking side light`,
          tip: 'Low sun skims surfaces — great for cliffs, dunes, and bark detail.',
        });
        break;
      case 'Astro':
        examples.push({
          tag,
          title: 'Milky Way / star field setup',
          when: `After ${formatClock(light.blueEvening.end)} (full dark)`,
          angle: 'Point away from towns; check southern sky for galactic core (seasonal)',
          tip: 'Wide lens (14–24mm), ISO 1600–3200, ~15–20s; red headlamp only.',
        });
        break;
      case 'Street':
        examples.push({
          tag,
          title: 'Long-shadow street geometry',
          when: formatWindow(light.goldenEvening),
          angle: `Walk with sun on your ${light.sunBearingLabel} flank for graphic shadows`,
          tip: 'Expose for highlights; look for repeating lines and silhouette cutouts.',
        });
        break;
      case 'Portrait':
        examples.push({
          tag,
          title: 'Soft backlight portrait',
          when: formatWindow(light.goldenEvening),
          angle: `Subject faces ${light.antiSunBearingLabel}; sun at ${light.sunBearingLabel} behind them`,
          tip: 'Rim light in hair — add a reflector or +0.7 EV on faces.',
        });
        examples.push({
          tag,
          title: 'Blue-hour environmental portrait',
          when: formatWindow(light.blueEvening),
          angle: 'Balance subject flash/LED with ambient sky',
          tip: 'Tripod or 1/60+ with IBIS; cool background, warm key light.',
        });
        break;
      case 'Wildlife':
        examples.push({
          tag,
          title: 'Golden catchlight window',
          when: formatWindow(light.goldenMorning),
          angle: `Keep sun at ${light.sunBearingLabel} — animal lit from the side/front`,
          tip: 'Arrive early; low angle at eye level; shutter ≥ 1/1000 for action.',
        });
        break;
      default:
        break;
    }
  }

  if (examples.length === 0) {
    examples.push({
      tag: 'General',
      title: `Scout pass at ${place}`,
      when: formatWindow(light.goldenEvening),
      angle: `Sun from ${light.sunBearingLabel} — face ${light.antiSunBearingLabel}`,
      tip: 'Walk a 360° once at golden hour and note which bearing has the cleanest backdrop.',
    });
  }

  return examples.slice(0, 4);
}

function bearingQuarter(azimuthDeg: number): string {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  if (normalized >= 45 && normalized < 135) return 'east–west features';
  if (normalized >= 135 && normalized < 225) return 'north–south features';
  if (normalized >= 225 && normalized < 315) return 'east–west features';
  return 'north–south features';
}
