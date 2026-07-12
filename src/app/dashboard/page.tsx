'use client';

import { useEffect, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PanelBottom } from 'lucide-react';

import { reverseGeocodeLocation } from '@/app/actions/reverse-geocode';
import { ScoutingDrawer } from '@/components/scouting-drawer';
import type { ScoutingFormValues } from '@/lib/schemas/scouting';
import type { LocationPhoto } from '@/types/scouting';

const MapCanvas = dynamic(
  () => import('@/components/map-canvas').then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-paper-soft text-xs text-muted">
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
  const [drawerOpen, setDrawerOpen] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 1024px)').matches
      : false,
  );
  const [, startGeocode] = useTransition();

  // Desktop: panel always open. Mobile: start closed for fullscreen map.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDrawerOpen(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!drawerOpen || window.matchMedia('(min-width: 1024px)').matches) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

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
      <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-baseline gap-3 sm:gap-4">
          <Link
            href="/"
            className="font-modern text-lg font-bold tracking-tight text-ink"
          >
            Aruna
          </Link>
          <p className="hidden text-xs text-muted sm:block">Scout desk</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-primary px-3 py-2 text-xs uppercase tracking-[0.14em] lg:hidden"
            aria-expanded={drawerOpen}
            aria-controls="scouting-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            Scout
          </button>
          <span className="hidden shrink-0 border border-line px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-muted sm:inline">
            Live
          </span>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        <MapCanvas
          locationName={mapPreview.locationName}
          latitude={mapPreview.latitude}
          longitude={mapPreview.longitude}
          tags={mapPreview.tags}
          showGuide={showGuide}
          photos={photos}
          onPick={handleMapPick}
        />

        {!drawerOpen ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="btn-primary absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 px-5 py-3 shadow-none lg:hidden"
            aria-controls="scouting-drawer"
            aria-expanded={false}
          >
            <PanelBottom className="size-4" aria-hidden />
            Open scout drawer
          </button>
        ) : null}

        <ScoutingDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
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
            setDrawerOpen(true);
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
