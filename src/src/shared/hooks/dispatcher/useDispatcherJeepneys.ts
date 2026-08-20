import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../shared/config/supabase";

export interface JeepneyWithOccupancy {
  id: string;
  plate_number: string;
  bracket: number;
  capacity: number;
  status: string;
  current_occupancy: number;
  queue_position: number | null;
  terminal_id: number;
  driver_name: string | null;
  driver_id: string | null;
  front_count?: number;
  rear_count?: number;
}

export function useDispatcherJeepneys(terminalId: number) {
  const [jeepneys, setJeepneys] = useState<JeepneyWithOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJeepneys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: jeepneyData, error: jeepneyError } = await supabase
        .from("jeepneys")
        .select("*")
        .eq("terminal_id", terminalId)
        .order("queue_position", {
          ascending: true,
          nullsFirst: false,
        });

      if (jeepneyError) {
        throw jeepneyError;
      }

      if (!jeepneyData || jeepneyData.length === 0) {
        setJeepneys([]);
        return;
      }

      const jeepneyIds = jeepneyData.map((jeepney: any) => jeepney.id);

      const { data: doorData, error: doorError } = await supabase
        .from("door_counts")
        .select("jeep_id, front_count, rear_count, updated_at")
        .in("jeep_id", jeepneyIds)
        .order("updated_at", {
          ascending: false,
        });

      if (doorError) {
        console.warn("Door counts error:", doorError.message);
      }

      const latestDoorMap = new Map<string, any>();

      (doorData || []).forEach((door) => {
        if (!latestDoorMap.has(door.jeep_id)) {
          latestDoorMap.set(door.jeep_id, door);
        }
      });

      const merged: JeepneyWithOccupancy[] = jeepneyData.map((jeepney: any) => {
        const door = latestDoorMap.get(jeepney.id);

        return {
          ...jeepney,
          front_count: door?.front_count || 0,
          rear_count: door?.rear_count || 0,
        };
      });

      setJeepneys(merged);
    } catch (err: any) {
      console.error("Fetch jeepneys error:", err);
      setError(err.message || "Failed to load jeepneys.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [terminalId]);

  const refreshJeepneys = useCallback(async () => {
    setRefreshing(true);
    await fetchJeepneys();
  }, [fetchJeepneys]);

  useEffect(() => {
    fetchJeepneys();

    const channel = supabase
      .channel(`dispatcher-jeepneys-${terminalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
          filter: `terminal_id=eq.${terminalId}`,
        },
        () => {
          fetchJeepneys();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "door_counts",
        },
        () => {
          fetchJeepneys();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [terminalId, fetchJeepneys]);

  return {
    jeepneys,
    loading,
    refreshing,
    error,
    fetchJeepneys,
    refreshJeepneys,
  };
}
