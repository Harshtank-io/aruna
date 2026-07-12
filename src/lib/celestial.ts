import * as SunCalc from 'suncalc';

export interface LightWindow {
  label: string;
  start: Date;
  end: Date;
}

export interface ScoutLight {
  dateLabel: string;
  timezoneNote: string;
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  goldenMorning: LightWindow;
  goldenEvening: LightWindow;
  blueMorning: LightWindow;
  blueEvening: LightWindow;
  /** Compass degrees: 0 = north, 90 = east */
  sunAzimuthDeg: number;
  sunAltitudeDeg: number;
  sunBearingLabel: string;
  antiSunBearingLabel: string;
  /** Where the sun is “pointing from” on the horizon right now */
  sunIsUp: boolean;
}

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

/** SunCalc azimuth is from south → west; convert to compass from north. */
export function azimuthToCompassDeg(azimuthRad: number): number {
  return ((azimuthRad * 180) / Math.PI + 180 + 360) % 360;
}

export function bearingLabel(degrees: number): string {
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[index];
}

export function formatClock(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatWindow(window: LightWindow): string {
  return `${formatClock(window.start)} – ${formatClock(window.end)}`;
}

/** Destination point ~distanceKm along compass bearing (for sun ray on map). */
export function destinationPoint(
  latitude: number,
  longitude: number,
  bearingDeg: number,
  distanceKm: number,
): { latitude: number; longitude: number } {
  const earthKm = 6371;
  const angular = distanceKm / earthKm;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (latitude * Math.PI) / 180;
  const lng1 = (longitude * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: ((((lng2 * 180) / Math.PI + 540) % 360) - 180),
  };
}

export function getScoutLight(
  latitude: number,
  longitude: number,
  date: Date = new Date(),
): ScoutLight {
  const times = SunCalc.getTimes(date, latitude, longitude);
  const position = SunCalc.getPosition(date, latitude, longitude);
  const sunAzimuthDeg = azimuthToCompassDeg(position.azimuth);
  const sunAltitudeDeg = (position.altitude * 180) / Math.PI;
  const antiAzimuth = (sunAzimuthDeg + 180) % 360;

  // ponytail: polar edge cases return null times — coerce to Invalid Date
  const d = (value: Date | null | undefined): Date =>
    value instanceof Date ? value : new Date(Number.NaN);

  return {
    dateLabel: date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    timezoneNote: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sunrise: d(times.sunrise),
    sunset: d(times.sunset),
    solarNoon: d(times.solarNoon),
    goldenMorning: {
      label: 'Morning golden hour',
      start: d(times.sunrise),
      end: d(times.goldenHourEnd),
    },
    goldenEvening: {
      label: 'Evening golden hour',
      start: d(times.goldenHour),
      end: d(times.sunset),
    },
    blueMorning: {
      label: 'Morning blue hour',
      start: d(times.dawn),
      end: d(times.sunrise),
    },
    blueEvening: {
      label: 'Evening blue hour',
      start: d(times.sunset),
      end: d(times.dusk),
    },
    sunAzimuthDeg,
    sunAltitudeDeg,
    sunBearingLabel: bearingLabel(sunAzimuthDeg),
    antiSunBearingLabel: bearingLabel(antiAzimuth),
    sunIsUp: sunAltitudeDeg > 0,
  };
}

export function formatScoutLightBlock(light: ScoutLight): string {
  return [
    `Date: ${light.dateLabel} (${light.timezoneNote})`,
    `Sunrise: ${formatClock(light.sunrise)} | Solar noon: ${formatClock(light.solarNoon)} | Sunset: ${formatClock(light.sunset)}`,
    `Morning golden hour: ${formatWindow(light.goldenMorning)}`,
    `Evening golden hour: ${formatWindow(light.goldenEvening)}`,
    `Morning blue hour: ${formatWindow(light.blueMorning)}`,
    `Evening blue hour: ${formatWindow(light.blueEvening)}`,
    `Sun now: altitude ${light.sunAltitudeDeg.toFixed(1)}°, azimuth ${light.sunAzimuthDeg.toFixed(0)}° (${light.sunBearingLabel})`,
    `Best facing for warm front-light: ${light.antiSunBearingLabel} (opposite the sun)`,
  ].join('\n');
}
