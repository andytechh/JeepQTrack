import { useCallback, useEffect, useState } from "react";
import { supabase } from "../config/supabase";

export interface TerminalInfo {
  id: 1 | 2;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
}

// Remembers the last terminals read from the database so reopening a screen is instant
// and never flashes built-in defaults.
let lastLoaded: TerminalInfo[] | null = null;

export function useTerminals() {
  const [terminals, setTerminals] = useState<TerminalInfo[] | null>(lastLoaded);
  const [loading, setLoading] = useState(lastLoaded == null);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("terminal_geofences")
        .select("id,name,lat,lng,radius_m")
        .order("id");

      if (error) {
        console.warn("Terminals load error:", error.message);
      } else if (data?.length) {
        lastLoaded = data as TerminalInfo[];
        setTerminals(lastLoaded);
      }
    } catch (e) {
      console.warn("Terminals load exception:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Unique channel name per mount (Supabase reuses channels with the same name).
    const channel = supabase
      .channel(
        `terminals-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "terminal_geofences" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { terminals, loading, refresh: load };
}

/** "Donsol Terminal" -> "Donsol". Falls back to the original names if not loaded. */
export function shortTerminalName(
  terminals: TerminalInfo[] | null,
  id: 1 | 2,
): string {
  const found = terminals?.find((t) => t.id === id)?.name;
  const cleaned = found?.replace(/ Terminal$/i, "").trim();
  return cleaned || (id === 1 ? "Donsol" : "Daraga");
}
