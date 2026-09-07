// src/shared/hooks/useDoorCounts.ts
import { supabase } from "@/src/shared/config/supabase";
import { useCallback, useEffect, useState } from "react";

export interface DoorCounts {
  frontCount: number;
  rearCount: number;
  updatedAt: string | null;
}

/**
 * Latest front/rear door count per jeepney id. Independent of the jeepneys
 * realtime channel — door_counts is its own table, so it gets its own
 * subscription. Safe to call with an empty array (no-op).
 */
export function useDoorCounts(jeepIds: string[]) {
  const [countsByJeepId, setCountsByJeepId] = useState
    Record<string, DoorCounts>
  >({});

  const idsKey = [...jeepIds].sort().join(",");

  const fetchCounts = useCallback(async () => {
    if (jeepIds.length === 0) {
      setCountsByJeepId({});
      return;
    }

    const { data, error } = await supabase
      .from("door_counts")
      .select("jeep_id, front_count, rear_count, updated_at")
      .in("jeep_id", jeepIds)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Door counts fetch error:", error.message);
      return;
    }

    const next: Record<string, DoorCounts> = {};
    (data || []).forEach((row) => {
      if (!row.jeep_id || next[row.jeep_id]) return; // first = most recent
      next[row.jeep_id] = {
        frontCount: row.front_count ?? 0,
        rearCount: row.rear_count ?? 0,
        updatedAt: row.updated_at,
      };
    });

    setCountsByJeepId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    if (jeepIds.length === 0) return;

    const channel = supabase
      .channel(`door-counts-${idsKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "door_counts" },
        (payload) => {
          const jeepId =
            (payload.new as any)?.jeep_id ?? (payload.old as any)?.jeep_id;
          if (jeepId && jeepIds.includes(jeepId)) fetchCounts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, fetchCounts]);

  return countsByJeepId;
}