// src/shared/hooks/useJeepney.ts
import { supabase } from "@/src/shared/config/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchJeepneysRef = useRef<() => Promise<void>>();

  const fetchJeepneys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: jeepneys, error: jeepneyError } = await supabase
        .from("jeepneys")
        .select("*")
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

  // Store latest fetch function in ref
  useEffect(() => {
    fetchJeepneysRef.current = fetchJeepneys;
  }, [fetchJeepneys]);

  // ─── Set up realtime subscription once ──────────────────────────
  useEffect(() => {
    // Clean up any existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const channel = supabase
      .channel("jeepneys-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jeepneys" },
        () => {
          console.log("🔄 Jeepney change detected, refetching...");
          if (fetchJeepneysRef.current) {
            fetchJeepneysRef.current();
          }
        },
      )
      .subscribe((status) => {
        console.log("📡 Jeepney subscription status:", status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // ─── Initial fetch ──────────────────────────────────────────────
  useEffect(() => {
    fetchJeepneys();
  }, []);

  return { data, loading, error, refetch: fetchJeepneys };
}
