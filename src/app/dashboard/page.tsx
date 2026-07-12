'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { reverseGeocodeLocation } from '@/app/actions/reverse-geocode';
import { ScoutingDrawer } from '@/components/scouting-drawer';
import type { ScoutingFormValues } from '@/lib/schemas/scouting';
import type { LocationPhoto } from '@/types/scouting';

const MapCanvas = dynamic(
  () => import('@/components/map-canvas').then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-paper-soft text-xs text-muted">
        Loading map…
      </div>
    ),
  },
);

export default function DashboardPage() {
  const [mapPreview, setMapPreview] = useState<Partial<ScoutingFormValues>>({});
  const [mapPick, setMapPick] = useState<{
    latitude: number;
    longitude: number;
    locationName?: string;
    nonce: number;
  } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [photos, setPhotos] = useState<LocationPhoto[]>([]);
  const [, startGeocode] = useTransition();

  const handleMapPick = (coords: {
    latitude: number;
    longitude: number;
  }) => {
    setShowGuide(false);
    setPhotos([]);
    setMapPreview((prev) => ({ ...prev, ...coords }));
    setMapPick({ ...coords, nonce: Date.now() });

    startGeocode(async () => {
      const place = await reverseGeocodeLocation(
        coords.latitude,
        coords.longitude,
      );
      if (!place.ok) {
        return;
      }
      setMapPreview((prev) => ({
        ...prev,
        ...coords,
        locationName: place.displayName,
      }));
      setMapPick({
        ...coords,
        locationName: place.displayName,
        nonce: Date.now(),
      });
    });
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper">
      <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-baseline gap-4">
          <Link
            href="/"
            className="font-modern text-lg font-bold tracking-tight text-ink"
          >
            Aruna
          </Link>
          <p className="hidden text-xs text-muted sm:block">
            Scout desk
          </p>
        </div>
        <span className="border border-line px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-muted">
          Live
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <MapCanvas
          locationName={mapPreview.locationName}
          latitude={mapPreview.latitude}
          longitude={mapPreview.longitude}
          tags={mapPreview.tags}
          showGuide={showGuide}
          photos={photos}
          onPick={handleMapPick}
        />
        <ScoutingDrawer
          onValuesChange={(values) => {
            setMapPreview((prev) => {
              const moved =
                (typeof values.latitude === 'number' &&
                  values.latitude !== prev.latitude) ||
                (typeof values.longitude === 'number' &&
                  values.longitude !== prev.longitude);
              if (moved) {
                setShowGuide(false);
                setPhotos([]);
              }
              return { ...prev, ...values };
            });
          }}
          mapPick={mapPick}
          onBriefingReady={(result) => {
            setPhotos(result.photos);
            setShowGuide(true);
            setMapPreview((prev) => ({
              ...prev,
              latitude: result.latitude,
              longitude: result.longitude,
              locationName: result.locationName,
            }));
            setMapPick({
              latitude: result.latitude,
              longitude: result.longitude,
              locationName: result.locationName,
              nonce: Date.now(),
            });
          }}
        />
      </div>
    </div>
  );
}
