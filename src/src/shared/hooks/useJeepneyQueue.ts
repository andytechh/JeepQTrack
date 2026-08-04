// hooks/useJeepneyQueue.ts
import { supabase } from "@/src/shared/config/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

export interface JeepneyQueueItem {
  id: string;
  plate_number: string;
  bracket: number;
  status: string;
  queue_position: number;
  terminal_id: number;
  current_occupancy: number;
  capacity: number;
  driver_name: string;
  loading_started_at: string | null;
  loading_ends_at: string | null;
}

const CACHE_DURATION = 30_000;

export function useJeepneyQueue() {
  const [data, setData] = useState<JeepneyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchQueue = useCallback(
    async (force = false) => {
      // Simple timestamp check
      const now = Date.now();
      if (!force && lastUpdate && now - lastUpdate.getTime() < CACHE_DURATION) {
        // data already set, skip
        return;
      }

      setLoading(true);
      setError(null);

      const { data: rows, error: fetchError } = await supabase
        .from("jeepneys")
        .select(
          "id, plate_number, bracket, status, queue_position, terminal_id, current_occupancy, capacity, driver_name, loading_started_at, loading_ends_at",
        )
        .in("terminal_id", [1, 2])
        .in("status", ["waiting", "loading"])
        .order("bracket", { ascending: true })
        .order("queue_position", { ascending: true, nullsLast: true });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const list = (rows as JeepneyQueueItem[]) ?? [];
      setData(list);
      setLastUpdate(new Date(now));
      setLoading(false);
    },
    [lastUpdate],
  );

  // Subscribe to realtime changes
  useEffect(() => {
    fetchQueue();
    const channel = supabase
      .channel("jeepney-queue-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jeepneys" },
        () => fetchQueue(true),
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel?.unsubscribe();
    };
  }, [fetchQueue]);

  return { data, loading, error, lastUpdate, refetch: () => fetchQueue(true) };
}
