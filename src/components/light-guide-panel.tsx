'use client';

import { Aperture, Camera, Compass, Sunrise } from 'lucide-react';

import { PhotoInspirationGrid } from '@/components/photo-inspiration-grid';
import {
  formatClock,
  formatWindow,
  type ScoutLight,
} from '@/lib/celestial';
import type { ShotExample } from '@/lib/shot-examples';
import type { LocationPhoto } from '@/types/scouting';

export interface LightGuidePanelProps {
  light: ScoutLight;
  examples: ShotExample[];
  photos?: LocationPhoto[];
  locationName?: string;
}

export function LightGuidePanel({
  light,
  examples,
  photos = [],
  locationName,
}: LightGuidePanelProps) {
  return (
    <div className="pointer-events-auto absolute bottom-2 left-2 right-2 z-10 max-h-[42%] overflow-y-auto border border-line bg-paper/95 p-3 backdrop-blur-sm sm:bottom-4 sm:left-4 sm:right-auto sm:max-h-[48%] sm:max-w-lg sm:p-4">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="label-caps text-accent">
            Light guide · {light.dateLabel}
          </p>
          <p className="font-display mt-1 truncate text-lg text-ink sm:text-xl">
            {locationName?.trim() || 'Pinned location'}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Times in {light.timezoneNote}
          </p>
        </div>
        <div className="box shrink-0 px-2 py-1.5 text-right sm:px-2.5">
          <p className="label-caps">Sun now</p>
          <p className="font-mono text-sm text-accent">
            {light.sunIsUp ? light.sunBearingLabel : 'Below'}
          </p>
          <p className="font-mono text-[11px] text-muted">
            {light.sunAltitudeDeg.toFixed(0)}° elev
          </p>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="mt-4">
          <p className="label-caps flex items-center gap-1.5">
            <Camera className="size-3.5 text-accent" aria-hidden />
            Location &amp; tag inspiration
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Study these frames, then recreate the light at your pin.
          </p>
          <div className="mt-2">
            <PhotoInspirationGrid photos={photos} compact />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">
          No inspiration photos matched this place + tags yet.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
        <div className="bg-paper px-2.5 py-2">
          <dt className="label-caps flex items-center gap-1">
            <Sunrise className="size-3" aria-hidden />
            Sunrise / set
          </dt>
          <dd className="mt-1 font-mono text-sm text-ink">
            {formatClock(light.sunrise)} · {formatClock(light.sunset)}
          </dd>
        </div>
        <div className="bg-paper px-2.5 py-2">
          <dt className="label-caps flex items-center gap-1">
            <Compass className="size-3" aria-hidden />
            Shoot facing
          </dt>
          <dd className="mt-1 font-mono text-sm text-ink">
            {light.antiSunBearingLabel}
            <span className="text-muted"> (warm)</span>
          </dd>
        </div>
        <div className="bg-paper px-2.5 py-2">
          <dt className="label-caps text-accent">Golden AM</dt>
          <dd className="mt-1 font-mono text-xs text-ink">
            {formatWindow(light.goldenMorning)}
          </dd>
        </div>
        <div className="bg-paper px-2.5 py-2">
          <dt className="label-caps text-accent">Golden PM</dt>
          <dd className="mt-1 font-mono text-xs text-ink">
            {formatWindow(light.goldenEvening)}
          </dd>
        </div>
        <div className="bg-paper px-2.5 py-2">
          <dt className="label-caps">Blue AM</dt>
          <dd className="mt-1 font-mono text-xs text-ink">
            {formatWindow(light.blueMorning)}
          </dd>
        </div>
        <div className="bg-paper px-2.5 py-2">
          <dt className="label-caps">Blue PM</dt>
          <dd className="mt-1 font-mono text-xs text-ink">
            {formatWindow(light.blueEvening)}
          </dd>
        </div>
      </dl>

      {examples.length > 0 ? (
        <div className="mt-4">
          <p className="label-caps flex items-center gap-1.5">
            <Aperture className="size-3.5 text-accent" aria-hidden />
            Shot examples
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {examples.map((example) => (
              <li
                key={`${example.tag}-${example.title}`}
                className="box p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {example.title}
                  </p>
                  <span className="shrink-0 border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                    {example.tag}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  <span className="text-muted">When:</span> {example.when}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  <span className="text-muted">Angle:</span> {example.angle}
                </p>
                <p className="mt-0.5 text-xs text-muted">{example.tip}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
