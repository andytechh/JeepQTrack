// src/shared/hooks/useJeepneys.ts
import { supabase } from "@/src/shared/config/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Jeepney {
  id: string;
  plate_number: string;
  driver_name: string;
  status: string;
  current_occupancy: number;
  capacity: number;
  terminal_id: number;
  queue_position: number | null;
  bracket: number;
}

export function useJeepneys() {
  const [data, setData] = useState<Jeepney[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchJeepneys = useCallback(async () => {
    try {
      setLoading(true);
      const { data: jeepneys, error: jeepneyError } = await supabase
        .from("jeepneys")
        .select(
          "id, plate_number, driver_name, status, current_occupancy, capacity, terminal_id, queue_position, bracket",
        )
        .order("bracket", { ascending: true })
        .order("queue_position", { ascending: true, nullsLast: true });

      if (jeepneyError) throw jeepneyError;
      setData(jeepneys || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJeepneys();
    const channel = supabase
      .channel("jeepneys-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jeepneys" },
        () => fetchJeepneys(),
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      channel?.unsubscribe();
    };
  }, [fetchJeepneys]);

  return { data, loading, error, refetch: fetchJeepneys };
}
