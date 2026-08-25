/**
 * Espelha a função `haversine_distance_m` do banco, para dar feedback
 * imediato na UI antes de chamar o servidor (a validação real acontece
 * sempre no Postgres, em register_check_in/register_check_out).
 */
export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusM: number
): boolean {
  return haversineDistanceMeters(lat1, lng1, lat2, lng2) <= radiusM;
}
