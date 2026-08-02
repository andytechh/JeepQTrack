import { useCallback, useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { JeepneyMarker } from "./useGPSMap";

export function useDispatcherGPS() {
  const [markers, setMarkers] = useState<JeepneyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkers = useCallback(async () => {
    try {
      setError(null);
      const { data: gpsData, error: gpsError } = await supabase
        .from("gps_tracking")
        .select(
          `
          jeepney_id,
          latitude,
          longitude,
          speed,
          recorded_at,
          jeepneys:jeepney_id (
            id,
            plate_number,
            status,
            current_occupancy,
            capacity,
            driver_name
          )
        `,
        )
        .order("recorded_at", { ascending: false })
        .limit(100);

      if (gpsError) throw gpsError;

      const uniqueMap = new Map<string, JeepneyMarker>();
      gpsData?.forEach((record: any) => {
        const j = record.jeepneys;
        if (!j || uniqueMap.has(record.jeepney_id)) return;
        uniqueMap.set(record.jeepney_id, {
          id: record.jeepney_id,
          lat: record.latitude,
          lng: record.longitude,
          plateNumber: j.plate_number,
          status: j.status || "en_route",
          occupancy: j.current_occupancy || 0,
          capacity: j.capacity || 24,
          driverName: j.driver_name || "Unknown",
          isDriver: false, // no driver-specific marker
          speed: record.speed,
        });
      });

      const markerList = Array.from(uniqueMap.values());
      setMarkers(markerList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkers();
    const gpsChannel = supabase
      .channel("dispatcher_gps_updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gps_tracking" },
        (payload) => {
          const newLoc = payload.new;
          setMarkers((prev) =>
            prev.map((m) =>
              m.id === newLoc.jeepney_id
                ? {
                    ...m,
                    lat: newLoc.latitude,
                    lng: newLoc.longitude,
                    speed: newLoc.speed,
                  }
                : m,
            ),
          );
          // Also add new jeepney if not in list
          // (for simplicity, we could refetch periodically)
        },
      )
      .subscribe();

    return () => gpsChannel.unsubscribe();
  }, []);

  return { markers, loading, error, fetchMarkers };
}
