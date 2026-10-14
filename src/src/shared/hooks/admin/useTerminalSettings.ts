// src/shared/hooks/admin/useTerminalSettings.ts
import { useCallback, useEffect, useMemo, useState } from "react";

// ASSUMPTION: adjust to wherever your Supabase client lives.
import { supabase } from "@/src/shared/config/supabase";
import { REAL_TERMINALS } from "@/src/shared/constants/terminalDefaults";

export type TerminalId = 1 | 2;

export interface TerminalConfig {
  id: TerminalId;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
}

// Remembers the last terminals loaded from Supabase, so reopening a screen shows the saved
// values immediately instead of flashing the built-in defaults.
let lastLoaded: TerminalConfig[] | null = null;

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** True when the given terminals are exactly the real ones. */
export function matchesReal(list: TerminalConfig[]) {
  return REAL_TERMINALS.every((r) => {
    const t = list.find((x) => x.id === r.id);
    return (
      !!t &&
      t.name === r.name &&
      near(t.lat, r.lat) &&
      near(t.lng, r.lng) &&
      t.radius_m === r.radius_m
    );
  });
}

const toRows = (list: TerminalConfig[]) =>
  list.map((t) => ({
    id: t.id,
    name: t.name.trim(),
    lat: t.lat,
    lng: t.lng,
    radius_m: Math.round(t.radius_m),
  }));

/**
 * Reads the 2 terminals (realtime) and lets an admin save or restore them.
 * Used by the Terminals admin screen AND the Fleet Monitoring screen.
 */
export function useTerminalSettings() {
  const [terminals, setTerminals] = useState<TerminalConfig[]>(
    lastLoaded ?? REAL_TERMINALS,
  );
  const [loading, setLoading] = useState(true);
  // True only once the terminals were really read from the database (or remembered from an
  // earlier read). Until then `terminals` may just be the built-in defaults.
  const [loaded, setLoaded] = useState(lastLoaded != null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("terminal_geofences")
      .select("id,name,lat,lng,radius_m")
      .order("id");

    if (err) {
      setError(err.message);
    } else if (data?.length) {
      lastLoaded = data as TerminalConfig[];
      setTerminals(lastLoaded);
      setLoaded(true);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Unique name per mount. Supabase returns the SAME channel object for a repeated name,
    // and calling .on() on an already-subscribed channel throws. Several screens (and React
    // dev double-mounting) use this hook at once.
    const channelName = `terminals-live-${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
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

  /** Returns null on success, or an error message. */
  const write = useCallback(
    async (list: TerminalConfig[]) => {
      setSaving(true);
      try {
        for (const t of list) {
          if (!t.name.trim()) return "Terminal name is required.";
          if (!Number.isFinite(t.lat) || !Number.isFinite(t.lng))
            return "Invalid coordinates.";
        }
        const { data, error: err } = await supabase
          .from("terminal_geofences")
          .upsert(toRows(list), { onConflict: "id" })
          .select("id");
        if (err) return err.message; // non-admins are rejected by RLS here
        if (!data || data.length !== list.length) {
          return "Nothing was saved. Your account may not have permission to edit terminals.";
        }
        await load();
        return null;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const save = useCallback((next: TerminalConfig[]) => write(next), [write]);

  /** Sends the hardcoded REAL geofences back to the database. */
  const restoreReal = useCallback(() => write(REAL_TERMINALS), [write]);

  const isReal = useMemo(() => matchesReal(terminals), [terminals]);

  return {
    terminals,
    isReal,
    loaded,
    loading,
    saving,
    error,
    refresh: load,
    save,
    restoreReal,
  };
}
