// src/shared/hooks/useCommuterQueue.ts
import { supabase } from "@/src/shared/config/supabase";
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
    } catch (err) {
      console.error("❌ Unexpected error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
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
        { event: "*", schema: "public", table: "jeepneys" },
        () => fetchQueue(),
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, []);

  return { jeepneys, loading, refreshing, refresh, error };
}
