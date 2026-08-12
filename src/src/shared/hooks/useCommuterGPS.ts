import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../config/supabase";
import { JeepneyMarker } from "./useGPSMap";

export interface CommuterJeepneyMarker extends JeepneyMarker {
  terminalId?: number;
  recordedAt?: string;
  isOnline?: boolean;
}

export function useCommuterGPS() {
  const [markers, setMarkers] = useState<CommuterJeepneyMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const channelRef = useRef<any>(null);

  /**
   * ============================================================
   * LOAD LATEST GPS
   * ============================================================
   */
  const loadLatestGPS = useCallback(async () => {
    try {
      setError(null);

      const { data, error: gpsError } = await supabase
        .from("latest_gps_tracking")
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
            driver_name,
            terminal_id
          )
        `,
        )
        .order("recorded_at", {
          ascending: false,
        });

      if (gpsError) {
        console.error("❌ Latest GPS error:", gpsError);
        setError("Unable to load jeepney GPS locations.");
        return;
      }

      const unique = new Map<string, CommuterJeepneyMarker>();

      data?.forEach((record: any) => {
        const jeepney = record.jeepneys;

        if (!jeepney) {
          return;
        }

        if (unique.has(record.jeepney_id)) {
          return;
        }

        const lat = Number(record.latitude);
        const lng = Number(record.longitude);
        const speed = Number(record.speed ?? 0);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return;
        }

        unique.set(record.jeepney_id, {
          id: record.jeepney_id,

          lat,
          lng,

          plateNumber: jeepney.plate_number ?? "Unknown",

          status: jeepney.status ?? "en_route",

          occupancy: Number(jeepney.current_occupancy ?? 0),

          capacity: Number(jeepney.capacity ?? 24),

          driverName: jeepney.driver_name ?? "Unknown",

          speed: Number.isFinite(speed) ? speed : 0,

          terminalId: Number(jeepney.terminal_id) === 2 ? 2 : 1,

          recordedAt: record.recorded_at,

          isOnline: true,
        });
      });

      const result = Array.from(unique.values());

      setMarkers(result);

      if (data?.[0]?.recorded_at) {
        setLastUpdate(data[0].recorded_at);
      }
    } catch (err) {
      console.error("❌ GPS loading exception:", err);
      setError("Unable to load live GPS data.");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ============================================================
   * MANUAL REFRESH
   * ============================================================
   */
  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadLatestGPS();
    } finally {
      setRefreshing(false);
    }
  }, [loadLatestGPS]);

  /**
   * ============================================================
   * REALTIME
   * ============================================================
   */
  useEffect(() => {
    loadLatestGPS();

    const channelName = `commuter-gps-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    const channel = supabase
      .channel(channelName)

      /**
       * GPS INSERT
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        (payload) => {
          const gps = payload.new as any;

          console.log(
            "📍 COMMUTER GPS:",
            gps.jeepney_id,
            gps.latitude,
            gps.longitude,
            "speed:",
            gps.speed,
          );

          const jeepneyId = gps.jeepney_id;

          const lat = Number(gps.latitude);
          const lng = Number(gps.longitude);
          const speed = Number(gps.speed ?? 0);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
          }

          setMarkers((current) => {
            const exists = current.some((m) => m.id === jeepneyId);

            /**
             * If this jeepney wasn't previously loaded,
             * reload metadata.
             */
            if (!exists) {
              loadLatestGPS();
              return current;
            }

            return current.map((marker) =>
              marker.id === jeepneyId
                ? {
                    ...marker,

                    lat,

                    lng,

                    speed: Number.isFinite(speed) ? speed : 0,

                    recordedAt: gps.recorded_at,

                    isOnline: true,
                  }
                : marker,
            );
          });

          setLastUpdate(gps.recorded_at);
        },
      )

      /**
       * JEEPNEY UPDATE
       */
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          const jeepney = payload.new as any;

          setMarkers((current) =>
            current.map((marker) =>
              marker.id === jeepney.id
                ? {
                    ...marker,

                    plateNumber: jeepney.plate_number ?? marker.plateNumber,

                    status: jeepney.status ?? marker.status,

                    occupancy: Number(
                      jeepney.current_occupancy ?? marker.occupancy ?? 0,
                    ),

                    capacity: Number(jeepney.capacity ?? marker.capacity ?? 24),

                    driverName: jeepney.driver_name ?? marker.driverName,

                    terminalId:
                      Number(jeepney.terminal_id ?? marker.terminalId ?? 1) ===
                      2
                        ? 2
                        : 1,

                    isOnline: true,
                  }
                : marker,
            ),
          );
        },
      )

      .subscribe((status) => {
        console.log("📡 Commuter GPS realtime:", status);
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [loadLatestGPS]);

  return {
    markers,
    loading,
    refreshing,
    error,
    lastUpdate,
    refresh,
  };
}
