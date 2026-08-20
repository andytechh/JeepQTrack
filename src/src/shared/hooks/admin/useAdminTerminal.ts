import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../config/supabase";

export type JeepneyStatus =
  "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";

export interface TerminalJeepney {
  id: string;
  plate_number: string;
  jeep_name: string | null;

  driver_id: string | null;
  driver_name: string | null;

  bracket: number;
  capacity: number;
  current_occupancy: number;

  status: JeepneyStatus;

  queue_position: number | null;

  terminal_id: number;

  departure_time: string | null;
  eta: number | null;

  current_latitude: number | null;
  current_longitude: number | null;

  loading_ends_at: string | null;

  created_at: string;
  updated_at: string;

  last_occupancy_update: string | null;
  last_gps_at: string | null;
}

export interface TerminalSummary {
  terminal_id: number;
  name: string;
  total: number;
  active: number;
  inactive: number;
  waiting: number;
  loading: number;
  enRoute: number;
}

export interface AdminTerminalsResult {
  jeepneys: TerminalJeepney[];

  terminalOneJeepneys: TerminalJeepney[];
  terminalTwoJeepneys: TerminalJeepney[];

  terminalOne: TerminalSummary;
  terminalTwo: TerminalSummary;

  loading: boolean;
  refreshing: boolean;
  saving: boolean;

  error: string | null;
  success: string | null;

  refresh: () => Promise<void>;

  assignTerminal: (jeepneyId: string, terminalId: number) => Promise<boolean>;

  clearMessages: () => void;
}

const SELECT_COLUMNS = `
  id,
  plate_number,
  jeep_name,
  driver_id,
  driver_name,
  bracket,
  capacity,
  current_occupancy,
  status,
  queue_position,
  terminal_id,
  departure_time,
  eta,
  current_latitude,
  current_longitude,
  loading_ends_at,
  created_at,
  updated_at,
  last_occupancy_update
`;

const EMPTY_TERMINAL = (terminalId: number, name: string): TerminalSummary => ({
  terminal_id: terminalId,
  name,
  total: 0,
  active: 0,
  inactive: 0,
  waiting: 0,
  loading: 0,
  enRoute: 0,
});

function isToday(dateString: string | null) {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getEffectiveStatus(
  status: JeepneyStatus,
  lastGpsAt: string | null,
): JeepneyStatus {
  if (!isToday(lastGpsAt)) {
    return "inactive";
  }

  return status;
}

export function useAdminTerminals(): AdminTerminalsResult {
  const [jeepneys, setJeepneys] = useState<TerminalJeepney[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadTerminals = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const { data, error: jeepneyError } = await supabase
        .from("jeepneys")
        .select(SELECT_COLUMNS)
        .order("terminal_id", {
          ascending: true,
        })
        .order("bracket", {
          ascending: true,
        })
        .order("plate_number", {
          ascending: true,
        });

      if (jeepneyError) {
        throw jeepneyError;
      }

      const { data: gpsRecords, error: gpsError } = await supabase
        .from("latest_gps_tracking")
        .select("jeepney_id, recorded_at")
        .order("recorded_at", {
          ascending: false,
        });

      if (gpsError) {
        console.error("Failed to load latest GPS records:", gpsError);
      }

      const lastGpsById = new Map<string, string>();

      gpsRecords?.forEach((record: any) => {
        if (!record.jeepney_id || lastGpsById.has(record.jeepney_id)) {
          return;
        }

        if (record.recorded_at) {
          lastGpsById.set(record.jeepney_id, record.recorded_at);
        }
      });

      const normalized: TerminalJeepney[] = (data ?? []).map((item: any) => {
        const lastGpsAt = lastGpsById.get(item.id) ?? null;

        const databaseStatus = (item.status ?? "inactive") as JeepneyStatus;

        return {
          id: item.id,

          plate_number: item.plate_number ?? "",

          jeep_name: item.jeep_name ?? null,

          driver_id: item.driver_id ?? null,

          driver_name: item.driver_name ?? null,

          bracket: Number(item.bracket ?? 0),

          capacity: Number(item.capacity ?? 24),

          current_occupancy: Number(item.current_occupancy ?? 0),

          status: getEffectiveStatus(databaseStatus, lastGpsAt),

          queue_position:
            item.queue_position == null ? null : Number(item.queue_position),

          terminal_id: Number(item.terminal_id ?? 1),

          departure_time: item.departure_time ?? null,

          eta: item.eta == null ? null : Number(item.eta),

          current_latitude:
            item.current_latitude == null
              ? null
              : Number(item.current_latitude),

          current_longitude:
            item.current_longitude == null
              ? null
              : Number(item.current_longitude),

          loading_ends_at: item.loading_ends_at ?? null,

          created_at: item.created_at ?? "",

          updated_at: item.updated_at ?? "",

          last_occupancy_update: item.last_occupancy_update ?? null,

          last_gps_at: lastGpsAt,
        };
      });

      setJeepneys(normalized);
    } catch (err: any) {
      console.error("Failed to load terminal jeepneys:", err);

      setError(err?.message ?? "Unable to load terminal jeepneys.");

      setJeepneys([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTerminals(false);
  }, [loadTerminals]);

  useEffect(() => {
    console.log("Starting terminal jeepney realtime subscription...");

    const channel = supabase
      .channel("admin-terminals-jeepneys")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jeepneys",
        },
        () => {
          loadTerminals(true);
        },
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
        },
        () => {
          loadTerminals(true);
        },
      )

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          const deleted = payload.old as any;

          setJeepneys((current) =>
            current.filter((jeepney) => jeepney.id !== deleted.id),
          );
        },
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        (payload) => {
          const gps = payload.new as any;

          if (!gps.jeepney_id) {
            return;
          }

          const jeepneyId = String(gps.jeepney_id);

          const recordedAt = gps.recorded_at ?? new Date().toISOString();

          setJeepneys((current) =>
            current.map((jeepney) => {
              if (jeepney.id !== jeepneyId) {
                return jeepney;
              }

              const databaseStatus =
                jeepney.status === "inactive" ? "waiting" : jeepney.status;

              return {
                ...jeepney,
                last_gps_at: recordedAt,
                status: getEffectiveStatus(databaseStatus, recordedAt),
              };
            }),
          );
        },
      )

      .subscribe((status) => {
        console.log("Terminal realtime status:", status);
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [loadTerminals]);

  const assignTerminal = useCallback(
    async (jeepneyId: string, terminalId: number) => {
      if (![1, 2].includes(terminalId)) {
        setError("Invalid terminal selected.");
        return false;
      }

      try {
        setSaving(true);
        setError(null);
        setSuccess(null);

        const { error: updateError } = await supabase
          .from("jeepneys")
          .update({
            terminal_id: terminalId,
          })
          .eq("id", jeepneyId);

        if (updateError) {
          throw updateError;
        }

        setJeepneys((current) =>
          current.map((jeepney) =>
            jeepney.id === jeepneyId
              ? {
                  ...jeepney,
                  terminal_id: terminalId,
                }
              : jeepney,
          ),
        );

        const terminalName = terminalId === 1 ? "Donsol" : "Daraga";

        setSuccess(`Jeepney assigned to ${terminalName} Terminal.`);

        return true;
      } catch (err: any) {
        console.error("Failed to assign jeepney terminal:", err);

        setError(err?.message ?? "Unable to update jeepney terminal.");

        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const terminalOneJeepneys = useMemo(
    () =>
      jeepneys
        .filter((jeepney) => jeepney.terminal_id === 1)
        .sort(
          (a, b) =>
            a.bracket - b.bracket ||
            a.plate_number.localeCompare(b.plate_number),
        ),
    [jeepneys],
  );

  const terminalTwoJeepneys = useMemo(
    () =>
      jeepneys
        .filter((jeepney) => jeepney.terminal_id === 2)
        .sort(
          (a, b) =>
            a.bracket - b.bracket ||
            a.plate_number.localeCompare(b.plate_number),
        ),
    [jeepneys],
  );

  const buildSummary = useCallback(
    (terminalId: number, name: string): TerminalSummary => {
      const list = jeepneys.filter(
        (jeepney) => jeepney.terminal_id === terminalId,
      );

      return {
        terminal_id: terminalId,
        name,

        total: list.length,

        active: list.filter((jeepney) => jeepney.status !== "inactive").length,

        inactive: list.filter((jeepney) => jeepney.status === "inactive")
          .length,

        waiting: list.filter((jeepney) => jeepney.status === "waiting").length,

        loading: list.filter((jeepney) => jeepney.status === "loading").length,

        enRoute: list.filter((jeepney) => jeepney.status === "en_route").length,
      };
    },
    [jeepneys],
  );

  const terminalOne = useMemo(
    () => buildSummary(1, "Donsol Terminal"),
    [buildSummary],
  );

  const terminalTwo = useMemo(
    () => buildSummary(2, "Daraga Terminal"),
    [buildSummary],
  );

  const refresh = useCallback(async () => {
    await loadTerminals(true);
  }, [loadTerminals]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    jeepneys,

    terminalOneJeepneys,
    terminalTwoJeepneys,

    terminalOne,
    terminalTwo,

    loading,
    refreshing,
    saving,

    error,
    success,

    refresh,

    assignTerminal,

    clearMessages,
  };
}
