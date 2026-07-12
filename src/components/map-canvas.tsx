'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import { MapPin, Mountain } from 'lucide-react';

import { LightGuidePanel } from '@/components/light-guide-panel';
import {
  destinationPoint,
  getScoutLight,
} from '@/lib/celestial';
import { buildShotExamples } from '@/lib/shot-examples';
import type { LocationPhoto, PhotographyTag } from '@/types/scouting';

import 'maplibre-gl/dist/maplibre-gl.css';

export interface MapCanvasProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  tags?: PhotographyTag[];
  showGuide?: boolean;
  photos?: LocationPhoto[];
  onPick?: (coords: { latitude: number; longitude: number }) => void;
}

/** OpenFreeMap first; Carto dark as offline-friendly fallback (no key). */
const STYLE_PRIMARY = 'https://tiles.openfreemap.org/styles/liberty';
const STYLE_FALLBACK =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const TERRAIN_TILES =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const DEFAULT_CENTER: [number, number] = [78.96, 20.59];
const DEFAULT_ZOOM = 3.2;
const PIN_ZOOM = 12.5;
const SUN_RAY_KM = 2.4;
const TERRAIN_SOURCE = 'aruna-terrarium';
const PIN_SOURCE = 'aruna-pin';
const SUN_SOURCE = 'aruna-sun-ray';

function isValidCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasActivePin(latitude?: number, longitude?: number): boolean {
  return (
    isValidCoord(latitude) &&
    isValidCoord(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

function emptyPointCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

function pointFeature(
  longitude: number,
  latitude: number,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      },
    ],
  };
}

function lineFeature(
  from: [number, number],
  to: [number, number],
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [from, to],
        },
      },
    ],
  };
}

function ensureOverlayLayers(map: MapLibreMap) {
  if (!map.getSource(PIN_SOURCE)) {
    map.addSource(PIN_SOURCE, {
      type: 'geojson',
      data: emptyPointCollection(),
    });
  }

  if (!map.getLayer('aruna-pin-halo')) {
    map.addLayer({
      id: 'aruna-pin-halo',
      type: 'circle',
      source: PIN_SOURCE,
      paint: {
        'circle-radius': 18,
        'circle-color': '#e85d04',
        'circle-opacity': 0.2,
        'circle-pitch-alignment': 'map',
      },
    });
  }

  if (!map.getLayer('aruna-pin-core')) {
    map.addLayer({
      id: 'aruna-pin-core',
      type: 'circle',
      source: PIN_SOURCE,
      paint: {
        'circle-radius': 7,
        'circle-color': '#e85d04',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-pitch-alignment': 'map',
      },
    });
  }

  if (!map.getSource(SUN_SOURCE)) {
    map.addSource(SUN_SOURCE, {
      type: 'geojson',
      data: emptyPointCollection(),
    });
  }

  if (!map.getLayer('aruna-sun-ray')) {
    map.addLayer({
      id: 'aruna-sun-ray',
      type: 'line',
      source: SUN_SOURCE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#e85d04',
        'line-width': 3,
        'line-opacity': 0.9,
        'line-dasharray': [1.2, 1.6],
      },
    });
  }
}

function tryEnableTerrain(map: MapLibreMap) {
  try {
    if (!map.getSource(TERRAIN_SOURCE)) {
      map.addSource(TERRAIN_SOURCE, {
        type: 'raster-dem',
        tiles: [TERRAIN_TILES],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15,
      });
    }
    map.setTerrain({ source: TERRAIN_SOURCE, exaggeration: 1.35 });
  } catch (error) {
    console.warn('[map] terrain unavailable', error);
  }
}

export function MapCanvas({
  latitude,
  longitude,
  locationName,
  tags = [],
  showGuide = false,
  photos = [],
  onPick,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const onPickRef = useRef(onPick);
  const usedFallbackStyle = useRef(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const pinActive = hasActivePin(latitude, longitude);
  const coordLabel = pinActive
    ? `${latitude!.toFixed(5)}, ${longitude!.toFixed(5)}`
    : 'Click the 3D map or enter a place name';

  const light = useMemo(() => {
    if (!pinActive) {
      return null;
    }
    return getScoutLight(latitude!, longitude!);
  }, [pinActive, latitude, longitude]);

  const examples = useMemo(() => {
    if (!light) {
      return [];
    }
    return buildShotExamples(light, tags, locationName ?? '');
  }, [light, tags, locationName]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_PRIMARY,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: 50,
        bearing: -18,
        maxPitch: 75,
        attributionControl: { compact: true },
      });
    } catch (error) {
      queueMicrotask(() =>
        setMapError(
          error instanceof Error ? error.message : 'Map failed to start.',
        ),
      );
      return;
    }

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'top-right',
    );

    try {
      map.addControl(new maplibregl.GlobeControl(), 'top-right');
    } catch {
      // Older GPUs / environments may not support globe control
    }

    const finishReady = () => {
      ensureOverlayLayers(map);
      tryEnableTerrain(map);
      setMapReady(true);
      setMapError(null);
      map.resize();
      requestAnimationFrame(() => map.resize());
      window.setTimeout(() => map.resize(), 250);
    };

    map.on('load', finishReady);

    map.on('error', (event) => {
      const message = event.error?.message ?? '';
      if (
        !usedFallbackStyle.current &&
        /style|fetch|network|failed/i.test(message)
      ) {
        usedFallbackStyle.current = true;
        map.setStyle(STYLE_FALLBACK);
        map.once('load', finishReady);
        return;
      }
      if (!map.isStyleLoaded()) {
        setMapError(message || 'Map style failed to load.');
      }
    });

    map.on('click', (event) => {
      onPickRef.current?.({
        latitude: Number(event.lngLat.lat.toFixed(5)),
        longitude: Number(event.lngLat.lng.toFixed(5)),
      });
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    const pinSource = map.getSource(PIN_SOURCE) as GeoJSONSource | undefined;
    const sunSource = map.getSource(SUN_SOURCE) as GeoJSONSource | undefined;
    if (!pinSource || !sunSource) {
      return;
    }

    if (!hasActivePin(latitude, longitude)) {
      pinSource.setData(emptyPointCollection());
      sunSource.setData(emptyPointCollection());
      return;
    }

    pinSource.setData(pointFeature(longitude!, latitude!));

    const nextZoom = map.getZoom() < 5 ? PIN_ZOOM : Math.max(map.getZoom(), 11);
    const camera = {
      center: [longitude!, latitude!] as [number, number],
      zoom: nextZoom,
      pitch: 58,
      bearing: showGuide && light?.sunIsUp ? light.sunAzimuthDeg : map.getBearing(),
      essential: true,
      duration: 900,
    };

    map.easeTo(camera);

    if (showGuide && light?.sunIsUp) {
      const tip = destinationPoint(
        latitude!,
        longitude!,
        light.sunAzimuthDeg,
        SUN_RAY_KM,
      );
      sunSource.setData(
        lineFeature([longitude!, latitude!], [tip.longitude, tip.latitude]),
      );
    } else {
      sunSource.setData(emptyPointCollection());
    }
  }, [latitude, longitude, light, showGuide, mapReady]);

  return (
    <section
      aria-label="3D location map canvas"
      className="relative flex h-full min-h-[50vh] flex-1 overflow-hidden bg-paper-soft"
    >
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />

      {!mapReady && !mapError ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-paper/50">
          <p className="border border-line bg-paper px-3 py-2 text-xs text-muted">
            Loading 3D map…
          </p>
        </div>
      ) : null}

      {mapError && !mapReady ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-paper/95 p-6">
          <div className="box max-w-sm px-4 py-3 text-center">
            <p className="text-sm font-medium text-ink">Map failed to load</p>
            <p className="mt-1 text-xs text-muted">{mapError}</p>
            <p className="mt-2 text-xs text-muted">
              Reload the page. You can still type a place name and generate a
              briefing.
            </p>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-sm items-start gap-2 border border-line bg-paper/95 px-3 py-2 backdrop-blur-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0">
          <p className="font-modern text-sm font-semibold tracking-tight text-ink">
            {locationName?.trim() || 'Unset location'}
          </p>
          <p className="font-mono text-xs text-muted">{coordLabel}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
            <Mountain className="size-3 text-accent" aria-hidden />
            MapLibre 3D · drag to orbit · scroll to zoom
          </p>
          {showGuide && light?.sunIsUp ? (
            <p className="mt-0.5 text-[11px] text-accent">
              Sun ray → {light.sunBearingLabel} (light direction)
            </p>
          ) : null}
        </div>
      </div>

      {showGuide && light ? (
        <LightGuidePanel
          light={light}
          examples={examples}
          photos={photos}
          locationName={locationName}
        />
      ) : null}
    </section>
  );
}
