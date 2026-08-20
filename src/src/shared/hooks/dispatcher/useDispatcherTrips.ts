import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../shared/config/supabase";

export interface TripLog {
  id: string;
  jeepney_id: string;
  jeepney_plate: string;
  driver_name: string;
  route: string;
  status: "completed" | "in_progress" | "cancelled";
  passengers: number;
  started_at: string;
  ended_at: string | null;
}

export function useDispatcherTrips() {
  const [tripLogs, setTripLogs] = useState<TripLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTripLogs = useCallback(async () => {
    try {
      setLoading(true);

      const { data: tripsData, error } = await supabase
        .from("trips")
        .select(
          `
          id,
          jeepney_id,
          route,
          status,
          total_passengers,
          departure_time,
          arrival_time,
          jeepneys:jeepney_id (
            plate_number,
            driver_name
          )
        `,
        )
        .order("departure_time", {
          ascending: false,
        })
        .limit(10);

      if (error) {
        throw error;
      }

      const logs: TripLog[] = (tripsData || []).map((trip: any) => ({
        id: trip.id,
        jeepney_id: trip.jeepney_id,
        jeepney_plate: trip.jeepneys?.plate_number || "Unknown",
        driver_name: trip.jeepneys?.driver_name || "Unknown",
        route: trip.route || "Donsol ↔ Daraga",
        status: trip.status || "completed",
        passengers: trip.total_passengers || 0,
        started_at: trip.departure_time,
        ended_at: trip.arrival_time,
      }));

      setTripLogs(logs);
    } catch (err: any) {
      console.warn("Trip logs error:", err.message);

      setTripLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTrips = useCallback(async () => {
    await fetchTripLogs();
  }, [fetchTripLogs]);

  useEffect(() => {
    fetchTripLogs();

    const channel = supabase
      .channel("dispatcher-trip-logs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trips",
        },
        () => {
          fetchTripLogs();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchTripLogs]);

  return {
    tripLogs,
    loading,
    fetchTripLogs,
    refreshTrips,
  };
}
