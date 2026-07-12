'use client';

import { useState } from 'react';

import type { LocationPhoto } from '@/types/scouting';

const MATCH_LABEL: Record<NonNullable<LocationPhoto['match']>, string> = {
  'location-tag': 'Location + style',
  location: 'This place',
  'region-tag': 'Region style',
  style: 'Style inspo',
};

export interface PhotoInspirationGridProps {
  photos: LocationPhoto[];
  compact?: boolean;
}

function PhotoThumb({
  photo,
  className,
}: {
  photo: LocationPhoto;
  className: string;
}) {
  const [src, setSrc] = useState(photo.thumbUrl || photo.fullUrl);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={photo.title}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== photo.fullUrl && photo.fullUrl) {
          setSrc(photo.fullUrl);
        }
      }}
    />
  );
}

export function PhotoInspirationGrid({
  photos,
  compact = false,
}: PhotoInspirationGridProps) {
  if (photos.length === 0) {
    return (
      <p className="text-xs text-muted">
        No matching inspiration photos yet — try a clearer place name or another
        tag.
      </p>
    );
  }

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo) => (
          <a
            key={photo.id}
            href={photo.pageUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative h-28 w-36 shrink-0 overflow-hidden border border-line bg-paper-soft"
            title={photo.inspireTip || photo.title}
          >
            <PhotoThumb
              photo={photo}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <span className="absolute left-1 top-1 border border-line bg-paper/90 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-accent">
              {photo.tag || MATCH_LABEL[photo.match ?? 'location']}
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-paper/90 px-1.5 py-1 text-[10px] leading-snug text-ink">
              <span className="line-clamp-2">{photo.title}</span>
            </span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {photos.map((photo) => (
        <a
          key={photo.id}
          href={photo.pageUrl}
          target="_blank"
          rel="noreferrer"
          className="overflow-hidden border border-line bg-paper"
        >
          <PhotoThumb
            photo={photo}
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="space-y-1 px-2 py-2">
            <div className="flex items-center gap-1">
              <span className="border border-accent/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-accent">
                {MATCH_LABEL[photo.match ?? 'location']}
              </span>
              {photo.tag ? (
                <span className="border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted">
                  {photo.tag}
                </span>
              ) : null}
            </div>
            <p className="line-clamp-2 text-xs font-medium text-ink">
              {photo.title}
            </p>
            {photo.inspireTip ? (
              <p className="line-clamp-3 text-[11px] leading-relaxed text-muted">
                {photo.inspireTip}
              </p>
            ) : null}
            <p className="truncate text-[10px] text-muted">{photo.credit}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
