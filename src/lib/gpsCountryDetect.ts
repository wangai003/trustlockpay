/**
 * Reverse-geocode GPS coordinates to ISO 3166-1 alpha-2 country code
 * using OpenStreetMap Nominatim (same service used for milestone GPS).
 */

export interface GpsCountryResult {
  countryCode: string;        // ISO alpha-2 e.g. "NG"
  countryName: string;        // e.g. "Nigeria"
  city?: string;
  state?: string;
  displayAddress: string;     // human-readable
  latitude: number;
  longitude: number;
}

export async function reverseGeocodeToCountry(
  lat: number,
  lng: number,
): Promise<GpsCountryResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=5&addressdetails=1`,
      { headers: { "User-Agent": "TrustLock/1.0" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address ?? {};
    const cc = (addr.country_code ?? "").toUpperCase();
    if (!cc) return null;

    return {
      countryCode: cc,
      countryName: addr.country ?? cc,
      city: addr.city ?? addr.town ?? addr.village,
      state: addr.state,
      displayAddress: data.display_name ?? `${lat}, ${lng}`,
      latitude: lat,
      longitude: lng,
    };
  } catch {
    return null;
  }
}
