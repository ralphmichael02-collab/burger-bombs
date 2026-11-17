// backend/src/utils/geo.js

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function pickBranchForDelivery(client, lat, lng) {
  if (lat == null || lng == null) return null;
  const { rows: branches } = await client.query(
    `SELECT id, name, lat::float, lng::float, delivery_radius_km::float
       FROM branches
      WHERE is_active = TRUE`
  );
  let best = null;
  let bestDist = Infinity;
  for (const b of branches) {
    const d = haversineKm(lat, lng, b.lat, b.lng);
    if (d <= b.delivery_radius_km && d < bestDist) {
      best = b;
      bestDist = d;
    }
  }
  return best;
}