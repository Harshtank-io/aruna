/** Treat form defaults / unset pin as missing coordinates. */
export function needsCoordinateLookup(
  latitude: number,
  longitude: number,
): boolean {
  return (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    (latitude === 0 && longitude === 0)
  );
}
