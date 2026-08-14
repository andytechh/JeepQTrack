// src/shared/hooks/useCommuterQueue.ts
import { supabase } from "@/src/shared/config/supabase";
import { calculateJeepneyEta } from "@/src/shared/utils/routeEta";
import { useEffect, useState } from "react";

export interface CommuterJeepney {
  id: string;
  number: string;
  status: "LOADING" | "WAITING" | "ARRIVED" | "EN_ROUTE" | "DEPARTED";
  passengers: number;
  capacity: number;
  estimatedDeparture: string;
  terminalId: number;
  jeepName: string;
  driverName: string;
  // Only populated for EN_ROUTE jeepneys with a live GPS fix - the road-route ETA,
  // computed the same way as the map screen (see src/shared/utils/routeEta.ts).
  remainingDistanceKm?: number;
  progressPercent?: number;
}

export function useCommuterQueue() {
  const [jeepneys, setJeepneys] = useState<CommuterJeepney[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔍 Fetching commuter queue...");

      const { data, error: fetchError } = await supabase
        .from("jeepneys")
        .select(
          "id, plate_number, bracket, status, current_occupancy, capacity, loading_started_at, queue_position, terminal_id, jeep_name, driver_name",
        )
        .in("status", [
          "arrived",
          "loading",
          "waiting",
          "en_route",
          "dispatched",
        ])
        .order("queue_position", { ascending: true, nullsLast: true })
        .order("bracket", { ascending: true });

      if (fetchError) {
        console.error("❌ Supabase error:", fetchError);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      console.log("✅ Raw data count:", data?.length || 0);
      if (data && data.length > 0) {
        console.log("📦 Sample:", data[0]);
      }

      const mapped: CommuterJeepney[] = (data || []).map((item) => {
        let status: CommuterJeepney["status"] = "DEPARTED";
        if (item.status === "loading") status = "LOADING";
        else if (item.status === "waiting") status = "WAITING";
        else if (item.status === "arrived") status = "ARRIVED";
        else if (item.status === "en_route") status = "EN_ROUTE";
        else status = "DEPARTED";

        const estDeparture =
          item.status === "loading" && item.loading_started_at
            ? new Date(
                new Date(item.loading_started_at).getTime() + 30 * 60000,
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "—";

        return {
          id: item.id,
          number: item.plate_number || String(item.bracket || "?"),
          status,
          passengers: item.current_occupancy || 0,
          capacity: item.capacity || 24,
          estimatedDeparture: estDeparture,
          terminalId: item.terminal_id || 1,
          jeepName: item.jeep_name || "",
          driverName: item.driver_name || "",
        };
      });

      setJeepneys(mapped);
      setLoading(false);

      // EN_ROUTE jeepneys still show "—" until their real ETA resolves below - fill it
      // in as a second pass so the queue list itself isn't blocked waiting on GPS + OSRM.
      const enRoute = mapped.filter((j) => j.status === "EN_ROUTE");
      if (enRoute.length > 0) {
        await attachEtas(enRoute);
      }
    } catch (err) {
      console.error("❌ Unexpected error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Looks up the latest GPS fix for each EN_ROUTE jeepney and computes its road-route
   * ETA, then merges the results into state. Jeepneys without a recent GPS fix keep
   * showing "—" rather than a stale or guessed ETA.
   */
  const attachEtas = async (enRoute: CommuterJeepney[]) => {
    try {
      const ids = enRoute.map((j) => j.id);

      const { data: gpsRows, error: gpsError } = await supabase
        .from("latest_gps_tracking")
        .select("jeepney_id, latitude, longitude, speed")
        .in("jeepney_id", ids);

      if (gpsError) {
        console.error("❌ GPS lookup for ETA failed:", gpsError);
        return;
      }

      const gpsByJeepneyId = new Map<
        string,
        { lat: number; lng: number; speed: number }
      >();
      (gpsRows || []).forEach((row: any) => {
        const lat = Number(row.latitude);
        const lng = Number(row.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          gpsByJeepneyId.set(row.jeepney_id, {
            lat,
            lng,
            speed: Number(row.speed || 0),
          });
        }
      });

      const results = await Promise.all(
        enRoute.map(async (j) => {
          const gps = gpsByJeepneyId.get(j.id);
          if (!gps) return { id: j.id, patch: null };

          const eta = await calculateJeepneyEta(
            gps.lat,
            gps.lng,
            j.terminalId,
            gps.speed,
          );
          if (!eta) return { id: j.id, patch: null };

          return {
            id: j.id,
            patch: {
              estimatedDeparture: eta.estimatedArrivalTime,
              remainingDistanceKm: eta.remainingDistanceKm,
              progressPercent: eta.progressPercent,
            },
          };
        }),
      );

      setJeepneys((current) =>
        current.map((j) => {
          const result = results.find((r) => r.id === j.id);
          return result?.patch ? { ...j, ...result.patch } : j;
        }),
      );
    } catch (err) {
      console.error("❌ Unexpected error attaching ETAs:", err);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchQueue();
  };

  useEffect(() => {
    fetchQueue();
    const channel = supabase
      .channel("commuter-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jeepneys" },
        () => fetchQueue(),
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, []);

  return { jeepneys, loading, refreshing, refresh, error };
}
