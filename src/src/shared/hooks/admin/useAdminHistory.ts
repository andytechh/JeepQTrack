import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/src/shared/config/supabase";

export interface TripHistoryItem {
  id: string;
  jeepney_name: string;
  plate_number: string;
  driver_name: string;
  route: string;
  status: string; // active | completed | incomplete
  departure_time: string | null;
  arrival_time: string | null;
  trip_duration: number | null; // seconds
  loading_duration_seconds: number | null;
  occupancy_at_departure: number;
  total_passengers: number;
  capacity: number | null;
  origin_terminal_id: number | null;
  destination_terminal_id: number | null;
  bracket: number | null;
}

const SELECT =
  "id, driver_name, route, status, departure_time, arrival_time, trip_duration, " +
  "loading_duration_seconds, occupancy_at_departure, total_passengers, capacity, " +
  "origin_terminal_id, destination_terminal_id, bracket, jeepneys(jeep_name, plate_number)";

function mapRow(row: any): TripHistoryItem {
  const jeep = Array.isArray(row.jeepneys) ? row.jeepneys[0] : row.jeepneys;
  return {
    id: row.id,
    jeepney_name: jeep?.jeep_name || "Jeepney",
    plate_number: jeep?.plate_number || "—",
    driver_name: row.driver_name || "Not Assigned",
    route: row.route || "—",
    status: row.status || "active",
    departure_time: row.departure_time,
    arrival_time: row.arrival_time,
    trip_duration: row.trip_duration,
    loading_duration_seconds: row.loading_duration_seconds,
    occupancy_at_departure: row.occupancy_at_departure ?? 0,
    total_passengers: row.total_passengers ?? 0,
    capacity: row.capacity,
    origin_terminal_id: row.origin_terminal_id,
    destination_terminal_id: row.destination_terminal_id,
    bracket: row.bracket,
  };
}

function sortByDeparture(list: TripHistoryItem[]) {
  return [...list].sort(
    (a, b) =>
      new Date(b.departure_time ?? 0).getTime() -
      new Date(a.departure_time ?? 0).getTime(),
  );
}

export function useTripHistory(limit = 100) {
  const [trips, setTrips] = useState<TripHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limitRef = useRef(limit);
  limitRef.current = limit;

  const fetchAll = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("trips")
      .select(SELECT)
      .order("departure_time", { ascending: false })
      .limit(limitRef.current);

    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setTrips((data ?? []).map(mapRow));
  }, []);

  const upsertOne = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("trips")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (!data) return;
    const item = mapRow(data);
    setTrips((prev) =>
      sortByDeparture([item, ...prev.filter((t) => t.id !== item.id)]).slice(
        0,
        limitRef.current,
      ),
    );
  }, []);

  useEffect(() => {
    let mounted = true;

    fetchAll().finally(() => mounted && setLoading(false));

    const channel = supabase
      .channel("admin-trip-history")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as any)?.id;
            if (id) setTrips((prev) => prev.filter((t) => t.id !== id));
            return;
          }
          const id = (payload.new as any)?.id;
          if (id) upsertOne(id);
        },
      )
      .subscribe((status) => {
        if (!mounted) return;
        const live = status === "SUBSCRIBED";
        setIsLive(live);
        // catch up on anything missed while disconnected
        if (live) fetchAll();
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchAll, upsertOne]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  return { trips, loading, refreshing, isLive, error, refresh };
}
