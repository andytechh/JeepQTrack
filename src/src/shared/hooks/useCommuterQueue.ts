import { supabase } from "@/src/shared/config/supabase";
import { calculateJeepneyEta } from "@/src/shared/utils/routeEta";
import { useEffect, useState } from "react";

export type CommuterJeepneyStatus =
  "LOADING" | "WAITING" | "ARRIVED" | "EN_ROUTE" | "DEPARTED" | "INACTIVE";

export interface CommuterJeepney {
  id: string;
  number: string;
  status: CommuterJeepneyStatus;
  passengers: number;
  capacity: number;
  estimatedDeparture: string;
  terminalId: number;
  jeepName: string;
  driverName: string;
  imageUrl: string | null;

  remainingDistanceKm?: number;
  progressPercent?: number;
}

export function useCommuterQueue() {
  const [jeepneys, setJeepneys] = useState<CommuterJeepney[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const attachEtas = async (enRoute: CommuterJeepney[]) => {
    try {
      if (enRoute.length === 0) {
        return;
      }

      const ids = enRoute.map((jeepney) => jeepney.id);

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
        {
          lat: number;
          lng: number;
          speed: number;
        }
      >();

      (gpsRows || []).forEach((row: any) => {
        const lat = Number(row.latitude);

        const lng = Number(row.longitude);

        const speed = Number(row.speed || 0);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          gpsByJeepneyId.set(row.jeepney_id, {
            lat,
            lng,
            speed,
          });
        }
      });

      const results = await Promise.all(
        enRoute.map(async (jeepney) => {
          const gps = gpsByJeepneyId.get(jeepney.id);

          if (!gps) {
            return {
              id: jeepney.id,
              patch: null,
            };
          }

          try {
            const eta = await calculateJeepneyEta(
              gps.lat,
              gps.lng,
              jeepney.terminalId,
              gps.speed,
            );

            if (!eta) {
              return {
                id: jeepney.id,
                patch: null,
              };
            }

            return {
              id: jeepney.id,
              patch: {
                estimatedDeparture: eta.estimatedArrivalTime,

                remainingDistanceKm: eta.remainingDistanceKm,

                progressPercent: eta.progressPercent,
              },
            };
          } catch (err) {
            console.error("❌ ETA calculation failed:", err);

            return {
              id: jeepney.id,
              patch: null,
            };
          }
        }),
      );

      setJeepneys((current) =>
        current.map((jeepney) => {
          const result = results.find((item) => item.id === jeepney.id);

          if (!result?.patch) {
            return jeepney;
          }

          return {
            ...jeepney,
            ...result.patch,
          };
        }),
      );
    } catch (err) {
      console.error("❌ Unexpected ETA error:", err);
    }
  };

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("jeepneys")
        .select(
          `
            id,
            plate_number,
            bracket,
            status,
            current_occupancy,
            capacity,
            loading_started_at,
            queue_position,
            terminal_id,
            jeep_name,
            driver_name,
            image_url
          `,
        )
        .in("status", [
          "arrived",
          "loading",
          "waiting",
          "en_route",
          "dispatched",
          "inactive",
        ])
        .order("terminal_id", {
          ascending: true,
        })
        .order("queue_position", {
          ascending: true,
          nullsLast: true,
        })
        .order("bracket", {
          ascending: true,
        });

      if (fetchError) {
        console.error("❌ Supabase queue error:", fetchError);

        setError(fetchError.message);
        return;
      }

      const mapped: CommuterJeepney[] = (data || []).map((item: any) => {
        let status: CommuterJeepneyStatus = "DEPARTED";

        switch (item.status) {
          case "loading":
            status = "LOADING";
            break;

          case "waiting":
            status = "WAITING";
            break;

          case "arrived":
            status = "ARRIVED";
            break;

          case "en_route":
            status = "EN_ROUTE";
            break;

          case "dispatched":
            status = "DEPARTED";
            break;

          case "inactive":
            status = "INACTIVE";
            break;

          default:
            status = "DEPARTED";
        }

        let estimatedDeparture = "—";

        if (item.status === "loading" && item.loading_started_at) {
          estimatedDeparture = new Date(
            new Date(item.loading_started_at).getTime() + 30 * 60 * 1000,
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        const imageUrl =
          typeof item.image_url === "string" && item.image_url.trim()
            ? item.image_url.trim()
            : null;

        return {
          id: item.id,

          number: item.plate_number || String(item.bracket || "?"),

          status,

          passengers: Number(item.current_occupancy) || 0,

          capacity: Number(item.capacity) || 24,

          estimatedDeparture,

          terminalId: Number(item.terminal_id) || 1,

          jeepName: item.jeep_name || "",

          driverName: item.driver_name || "",

          imageUrl,
        };
      });

      setJeepneys(mapped);

      const enRoute = mapped.filter((jeepney) => jeepney.status === "EN_ROUTE");

      if (enRoute.length > 0) {
        await attachEtas(enRoute);
      }
    } catch (err) {
      console.error("❌ Unexpected queue error:", err);

      setError(err instanceof Error ? err.message : "Unable to load queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
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
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
        },
        () => {
          fetchQueue();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    jeepneys,
    loading,
    refreshing,
    refresh,
    error,
  };
}
