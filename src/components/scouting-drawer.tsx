'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Sparkles, Tag, X } from 'lucide-react';

import { generateArunaBriefing } from '@/app/actions/generate-briefing';
import { forwardGeocodeLocation } from '@/app/actions/reverse-geocode';
import { BriefingPanel } from '@/components/briefing-panel';
import { PhotoInspirationGrid } from '@/components/photo-inspiration-grid';
import {
  scoutingFormSchema,
  type ScoutingFormValues,
} from '@/lib/schemas/scouting';
import { PHOTOGRAPHY_TAGS, type LocationPhoto } from '@/types/scouting';

const GEOCODE_DEBOUNCE_MS = 650;

export interface ScoutingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onValuesChange?: (values: Partial<ScoutingFormValues>) => void;
  mapPick?: {
    latitude: number;
    longitude: number;
    locationName?: string;
    nonce: number;
  } | null;
  onBriefingReady?: (result: {
    photos: LocationPhoto[];
    latitude: number;
    longitude: number;
    locationName: string;
  }) => void;
}

const defaultValues: ScoutingFormValues = {
  locationName: '',
  latitude: 0,
  longitude: 0,
  tags: [],
};

export function ScoutingDrawer({
  open,
  onOpenChange,
  onValuesChange,
  mapPick,
  onBriefingReady,
}: ScoutingDrawerProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [photos, setPhotos] = useState<LocationPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);
  const skipNameGeocodeRef = useRef(false);
  const lastGeocodedNameRef = useRef('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<ScoutingFormValues>({
    resolver: zodResolver(scoutingFormSchema),
    defaultValues,
    mode: 'onSubmit',
  });

  const selectedTags = watch('tags');
  const locationName = watch('locationName');

  const emitChange = (patch: Partial<ScoutingFormValues>) => {
    // getValues() avoids watch() lag so map stays in sync while typing
    onValuesChange?.({ ...getValues(), ...patch });
  };

  useEffect(() => {
    if (!mapPick) {
      return;
    }
    skipNameGeocodeRef.current = true;
    setValue('latitude', mapPick.latitude, { shouldDirty: true });
    setValue('longitude', mapPick.longitude, { shouldDirty: true });
    if (mapPick.locationName) {
      setValue('locationName', mapPick.locationName, { shouldDirty: true });
      lastGeocodedNameRef.current = mapPick.locationName.trim().toLowerCase();
    }
    onValuesChange?.({
      ...getValues(),
      latitude: mapPick.latitude,
      longitude: mapPick.longitude,
      ...(mapPick.locationName
        ? { locationName: mapPick.locationName }
        : {}),
    });
  }, [mapPick, setValue, getValues, onValuesChange]);

  // Live map: debounce place-name → coordinates
  useEffect(() => {
    const name = locationName?.trim() ?? '';
    if (skipNameGeocodeRef.current) {
      skipNameGeocodeRef.current = false;
      return;
    }
    if (name.length < 3) {
      return;
    }
    if (name.toLowerCase() === lastGeocodedNameRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsLocating(true);
      void forwardGeocodeLocation(name)
        .then((place) => {
          if (!place.ok) {
            return;
          }
          if (
            getValues('locationName').trim().toLowerCase() !== name.toLowerCase()
          ) {
            return;
          }
          lastGeocodedNameRef.current = name.toLowerCase();
          setValue('latitude', place.latitude, { shouldDirty: true });
          setValue('longitude', place.longitude, { shouldDirty: true });
          setBriefing(null);
          setPhotos([]);
          onValuesChange?.({
            ...getValues(),
            locationName: name,
            latitude: place.latitude,
            longitude: place.longitude,
          });
        })
        .finally(() => setIsLocating(false));
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [locationName, setValue, getValues, onValuesChange]);

  const toggleTag = (tag: (typeof PHOTOGRAPHY_TAGS)[number]) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((item) => item !== tag)
      : [...selectedTags, tag];
    setValue('tags', next, { shouldValidate: true, shouldDirty: true });
    emitChange({ tags: next });
  };

  const onSubmit = (values: ScoutingFormValues) => {
    setError(null);
    setBriefing(null);
    setPhotos([]);
    startTransition(async () => {
      const result = await generateArunaBriefing(values);
      if (result.ok) {
        setBriefing(result.markdown);
        setPhotos(result.photos);
        skipNameGeocodeRef.current = true;
        lastGeocodedNameRef.current = result.locationName.trim().toLowerCase();
        setValue('latitude', result.latitude, { shouldDirty: true });
        setValue('longitude', result.longitude, { shouldDirty: true });
        setValue('locationName', result.locationName, { shouldDirty: true });
        onValuesChange?.({
          ...getValues(),
          latitude: result.latitude,
          longitude: result.longitude,
          locationName: result.locationName,
        });
        onBriefingReady?.({
          photos: result.photos,
          latitude: result.latitude,
          longitude: result.longitude,
          locationName: result.locationName,
        });
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close scouting drawer"
        tabIndex={open ? 0 : -1}
        onClick={() => onOpenChange(false)}
        className={`fixed inset-0 z-30 bg-ink/40 transition-opacity lg:hidden ${
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="scouting-drawer"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 z-40 flex h-[94dvh] max-h-[94dvh] flex-col border-t border-line bg-paper transition-transform duration-300 ease-out lg:static lg:z-auto lg:h-full lg:max-h-none lg:w-full lg:max-w-md lg:translate-y-0 lg:border-l lg:border-t-0 ${
          open ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        }`}
      >
        <div className="flex shrink-0 justify-center pt-2 lg:hidden">
          <button
            type="button"
            aria-label="Close drawer"
            onClick={() => onOpenChange(false)}
            className="h-1 w-10 bg-line-strong"
          />
        </div>

        <header className="shrink-0 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="label-caps text-accent">Scouting</p>
              <h2 className="font-display mt-1 text-xl text-ink sm:text-2xl">
                Location brief
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Type a place — the map moves live. Pick tags, then Generate for
                photos and the AI briefing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="box flex size-9 shrink-0 items-center justify-center text-ink lg:hidden"
              aria-label="Close drawer"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          <form
            className="flex flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="locationName" className="label-caps">
                Location name
              </label>
              <input
                id="locationName"
                type="text"
                placeholder="Ridge overlook, Joshua Tree"
                className="field-input"
                {...register('locationName', {
                  onChange: (event) =>
                    emitChange({ locationName: event.target.value }),
                })}
              />
              {isLocating ? (
                <p className="flex items-center gap-1.5 text-xs text-accent">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  Updating map…
                </p>
              ) : null}
              {errors.locationName ? (
                <p className="text-xs text-accent" role="alert">
                  {errors.locationName.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="latitude" className="label-caps">
                  Latitude
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="34.01234"
                  className="field-input font-mono"
                  {...register('latitude', {
                    valueAsNumber: true,
                    onChange: (event) =>
                      emitChange({ latitude: Number(event.target.value) }),
                  })}
                />
                {errors.latitude ? (
                  <p className="text-xs text-accent" role="alert">
                    {errors.latitude.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="longitude" className="label-caps">
                  Longitude
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="-116.12345"
                  className="field-input font-mono"
                  {...register('longitude', {
                    valueAsNumber: true,
                    onChange: (event) =>
                      emitChange({ longitude: Number(event.target.value) }),
                  })}
                />
                {errors.longitude ? (
                  <p className="text-xs text-accent" role="alert">
                    {errors.longitude.message}
                  </p>
                ) : null}
              </div>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="label-caps flex items-center gap-1.5">
                <Tag className="size-3.5" aria-hidden />
                Photography tags
              </legend>
              <div className="flex flex-wrap gap-2">
                {PHOTOGRAPHY_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTag(tag)}
                      className={active ? 'tag-chip-active' : 'tag-chip'}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {errors.tags ? (
                <p className="text-xs text-accent" role="alert">
                  {errors.tags.message}
                </p>
              ) : null}
            </fieldset>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Generating briefing…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden />
                  Generate Aruna AI Briefing
                </>
              )}
            </button>
          </form>

          {error ? (
            <p
              className="mt-5 border border-accent/40 bg-accent/5 px-3 py-2 text-sm text-ink"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {photos.length > 0 ? (
            <div className="mt-5">
              <h3 className="label-caps text-accent">Shot inspiration</h3>
              <p className="mt-1 text-xs text-muted">
                Location frames + your tag style so you can recreate the look.
              </p>
              <div className="mt-2">
                <PhotoInspirationGrid photos={photos} />
              </div>
            </div>
          ) : null}

          {briefing ? <BriefingPanel markdown={briefing} /> : null}
        </div>
      </aside>
    </>
  );
}
