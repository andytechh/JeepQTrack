// hooks/useJeepneyQueue.ts
import { supabase } from "@/src/shared/config/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

export interface JeepneyQueueItem {
  id: string;
  plate_number: string;
  bracket: number;
  status: string; // 'waiting' | 'loading'
  queue_position: number;
  terminal_id: number;
  current_occupancy: number;
  capacity: number;
  driver_name: string;
  loading_started_at: string | null;
  loading_ends_at: string | null;
}

const CACHE_KEY = "all_jeepney_queue";
const CACHE_DURATION = 30_000; // 30 seconds

interface QueueCache {
  data: JeepneyQueueItem[];
  timestamp: number;
}

const queueCache = new Map<string, QueueCache>();

export function useJeepneyQueue() {
  const [data, setData] = useState<JeepneyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchQueue = useCallback(async (force = false) => {
    const cached = queueCache.get(CACHE_KEY);
    const now = Date.now();

    if (!force && cached && now - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setLastUpdate(new Date(cached.timestamp));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: rows, error: fetchError } = await supabase
      .from("jeepneys")
      .select("*")
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
    queueCache.set(CACHE_KEY, { data: list, timestamp: now });
    setData(list);
    setLastUpdate(new Date(now));
    setLoading(false);
  }, []);

  // Subscribe to all jeepneys (both terminals)
  const subscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    const channel = supabase
      .channel("jeepney-queue")
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

  useEffect(() => {
    fetchQueue();
    const unsubscribe = subscribe();
    return () => {
      unsubscribe();
    };
  }, [fetchQueue, subscribe]);

  return { data, loading, error, lastUpdate, refetch: () => fetchQueue(true) };
}
