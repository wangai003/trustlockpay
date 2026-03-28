// GPS coordinate capture for milestone completion (Phase 1)
import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capturePosition = useCallback((): Promise<GeoPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const msg = "Geolocation is not supported by this browser";
        setError(msg);
        toast.error(msg);
        resolve(null);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geo: GeoPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            capturedAt: new Date().toISOString(),
          };
          setPosition(geo);
          setLoading(false);
          resolve(geo);
        },
        (err) => {
          let msg = "Failed to get location";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = "Location permission denied. Please enable GPS.";
              break;
            case err.POSITION_UNAVAILABLE:
              msg = "Location unavailable. Check your GPS connection.";
              break;
            case err.TIMEOUT:
              msg = "Location request timed out. Try again.";
              break;
          }
          setError(msg);
          setLoading(false);
          toast.error(msg);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { position, loading, error, capturePosition };
}
