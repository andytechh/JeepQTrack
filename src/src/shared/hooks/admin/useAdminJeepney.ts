import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../config/supabase";

export type AdminJeepneyStatus =
  "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";

export interface AdminJeepneyRecord {
  id: string;
  plate_number: string;
  jeep_name: string | null;

  driver_id: string | null;
  driver_name: string | null;

  bracket: number;
  capacity: number;
  current_occupancy: number;

  status: AdminJeepneyStatus;
  queue_position: number | null;

  terminal_id: string | null;
  terminal_name: string | null;
  bracket_number: number;

  last_occupancy_update: string | null;
  departure_time: string | null;
  eta: number | null;

  current_latitude: number | null;
  current_longitude: number | null;
  loading_ends_at: string | null;

  last_gps_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface AvailableDriver {
  id: string;
  display_name: string;
}

export interface AddJeepneyInput {
  plate_number: string;
  jeep_name: string | null;
  bracket: number;
  capacity: number;
  driver_id: string | null;
}

interface UseAdminJeepneysResult {
  jeepneys: AdminJeepneyRecord[];
  availableDrivers: AvailableDriver[];

  loading: boolean;
  refreshing: boolean;
  driversLoading: boolean;

  error: string | null;
  driversError: string | null;

  refresh: () => Promise<void>;
  loadAvailableDrivers: () => Promise<void>;

  addJeepney: (input: AddJeepneyInput) => Promise<void>;
}

const DEFAULT_CAPACITY = 24;

function isToday(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);

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

function normalizeJeepney(
  item: any,
  assignment?: any,
  lastGpsAt: string | null = null,
): AdminJeepneyRecord {
  const terminal = assignment?.terminals;

  const originalStatus = (item.status ?? "inactive") as AdminJeepneyStatus;

  const status = isToday(lastGpsAt) ? originalStatus : "inactive";

  const bracket = Number(item.bracket ?? terminal?.bracket_number ?? 0);

  return {
    id: String(item.id),

    plate_number: item.plate_number ?? "",

    jeep_name: item.jeep_name ?? null,

    driver_id: item.driver_id ?? null,

    driver_name: item.driver?.display_name ?? item.driver_name ?? null,

    bracket,

    capacity: Number(item.capacity ?? DEFAULT_CAPACITY),

    current_occupancy: Number(item.current_occupancy ?? 0),

    status,

    queue_position:
      item.queue_position === null || item.queue_position === undefined
        ? null
        : Number(item.queue_position),

    terminal_id:
      item.terminal_id !== null && item.terminal_id !== undefined
        ? String(item.terminal_id)
        : assignment?.terminal_id
          ? String(assignment.terminal_id)
          : null,

    terminal_name: terminal?.name ?? null,

    bracket_number: bracket,

    last_occupancy_update: item.last_occupancy_update ?? null,

    departure_time: item.departure_time ?? null,

    eta: item.eta === null || item.eta === undefined ? null : Number(item.eta),

    current_latitude:
      item.current_latitude === null || item.current_latitude === undefined
        ? null
        : Number(item.current_latitude),

    current_longitude:
      item.current_longitude === null || item.current_longitude === undefined
        ? null
        : Number(item.current_longitude),

    loading_ends_at: item.loading_ends_at ?? null,

    last_gps_at: lastGpsAt,

    created_at: item.created_at ?? new Date().toISOString(),

    updated_at: item.updated_at ?? new Date().toISOString(),
  };
}

export function useAdminJeepneys(): UseAdminJeepneysResult {
  const [jeepneys, setJeepneys] = useState<AdminJeepneyRecord[]>([]);

  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driversLoading, setDriversLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [driversError, setDriversError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadJeepneys = useCallback(async () => {
    const { data, error: jeepneyError } = await supabase
      .from("jeepneys")
      .select(
        `
          id,
          plate_number,
          jeep_name,
          driver_id,
          capacity,
          bracket,
          current_occupancy,
          status,
          queue_position,
          terminal_id,
          last_occupancy_update,
          departure_time,
          eta,
          current_latitude,
          current_longitude,
          loading_ends_at,
          created_at,
          updated_at
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (jeepneyError) {
      throw jeepneyError;
    }

    const jeepneyRows = data ?? [];

    let assignments: any[] = [];

    if (jeepneyRows.length > 0) {
      const jeepneyIds = jeepneyRows.map((item) => item.id);

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("terminal_jeepneys")
        .select(
          `
          jeepney_id,
          terminal_id,
          terminals (
            id,
            name,
            bracket_number
          )
        `,
        )
        .in("jeepney_id", jeepneyIds)
        .eq("is_active", true);

      if (assignmentError) {
        console.error("Unable to load terminal assignments:", assignmentError);
      } else {
        assignments = assignmentData ?? [];
      }
    }

    const assignmentMap = new Map<string, any>();

    assignments.forEach((assignment) => {
      const id = String(assignment.jeepney_id);

      if (!assignmentMap.has(id)) {
        assignmentMap.set(id, assignment);
      }
    });

    let gpsRecords: any[] = [];

    if (jeepneyRows.length > 0) {
      const { data: gpsData, error: gpsError } = await supabase
        .from("latest_gps_tracking")
        .select("jeepney_id, recorded_at")
        .order("recorded_at", {
          ascending: false,
        });

      if (gpsError) {
        console.error("Unable to load latest GPS:", gpsError);
      } else {
        gpsRecords = gpsData ?? [];
      }
    }

    const lastGpsMap = new Map<string, string>();

    gpsRecords.forEach((record: any) => {
      if (!record.jeepney_id) {
        return;
      }

      const id = String(record.jeepney_id);

      if (!lastGpsMap.has(id)) {
        lastGpsMap.set(id, record.recorded_at);
      }
    });

    const normalized = jeepneyRows.map((item: any) =>
      normalizeJeepney(
        item,
        assignmentMap.get(String(item.id)),
        lastGpsMap.get(String(item.id)) ?? null,
      ),
    );

    setJeepneys(normalized);
  }, []);

  const loadAvailableDrivers = useCallback(async () => {
    try {
      setDriversLoading(true);
      setDriversError(null);

      const { data: drivers, error: driversFetchError } = await supabase
        .from("users")
        .select("id, display_name")
        .eq("role", "driver")
        .order("display_name", {
          ascending: true,
        });

      if (driversFetchError) {
        throw driversFetchError;
      }

      const { data: assignments, error: assignmentError } = await supabase
        .from("jeepneys")
        .select("driver_id")
        .not("driver_id", "is", null);

      if (assignmentError) {
        throw assignmentError;
      }

      const assignedDriverIds = new Set(
        (assignments ?? [])
          .map((row: any) => row.driver_id)
          .filter(Boolean)
          .map(String),
      );

      const available = (drivers ?? [])
        .filter((driver: any) => {
          if (!driver.id) {
            return false;
          }

          if (!driver.display_name?.trim()) {
            return false;
          }

          return !assignedDriverIds.has(String(driver.id));
        })
        .map((driver: any) => ({
          id: String(driver.id),
          display_name: driver.display_name.trim(),
        }));

      setAvailableDrivers(available);
    } catch (err: any) {
      console.error("Failed to load available drivers:", err);

      setDriversError(err?.message ?? "Unable to load available drivers.");

      setAvailableDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      await Promise.all([loadJeepneys(), loadAvailableDrivers()]);
    } catch (err: any) {
      console.error("Failed to refresh admin jeepneys:", err);

      setError(err?.message ?? "Unable to load jeepney information.");
    } finally {
      setRefreshing(false);
    }
  }, [loadJeepneys, loadAvailableDrivers]);

  const addJeepney = useCallback(
    async (input: AddJeepneyInput) => {
      const plateNumber = input.plate_number.trim();

      const jeepName = input.jeep_name?.trim() || null;

      if (!plateNumber) {
        throw new Error("Plate number is required.");
      }

      if (!Number.isInteger(input.bracket) || input.bracket <= 0) {
        throw new Error("Bracket must be a valid number greater than zero.");
      }

      if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
        throw new Error(
          "Maximum capacity must be a valid number greater than zero.",
        );
      }

      const { data: existingPlate, error: existingPlateError } = await supabase
        .from("jeepneys")
        .select("id")
        .eq("plate_number", plateNumber)
        .maybeSingle();

      if (existingPlateError) {
        throw existingPlateError;
      }

      if (existingPlate) {
        throw new Error("A jeepney with this plate number already exists.");
      }

      const { data: existingBracket, error: bracketError } = await supabase
        .from("jeepneys")
        .select("id")
        .eq("bracket", input.bracket)
        .maybeSingle();

      if (bracketError) {
        throw bracketError;
      }

      if (existingBracket) {
        throw new Error(
          `Bracket ${input.bracket} is already assigned to another jeepney.`,
        );
      }

      if (input.driver_id) {
        const { data: assignedDriver, error: assignedDriverError } =
          await supabase
            .from("jeepneys")
            .select("id")
            .eq("driver_id", input.driver_id)
            .maybeSingle();

        if (assignedDriverError) {
          throw assignedDriverError;
        }

        if (assignedDriver) {
          throw new Error(
            "That driver is already assigned to another jeepney.",
          );
        }
      }

      const { data, error: insertError } = await supabase
        .from("jeepneys")
        .insert({
          plate_number: plateNumber,
          jeep_name: jeepName,
          bracket: input.bracket,
          capacity: input.capacity,
          driver_id: input.driver_id || null,
          current_occupancy: 0,
          status: "inactive",
          queue_position: null,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const normalized = normalizeJeepney(data, undefined, null);

      setJeepneys((current) => [normalized, ...current]);

      await loadAvailableDrivers();
    },
    [loadAvailableDrivers],
  );

  useEffect(() => {
    let mounted = true;

    const initialLoad = async () => {
      try {
        setLoading(true);
        setError(null);

        await Promise.all([loadJeepneys(), loadAvailableDrivers()]);
      } catch (err: any) {
        console.error("Failed to load admin jeepneys:", err);

        if (mounted) {
          setError(err?.message ?? "Unable to load jeepney information.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialLoad();

    return () => {
      mounted = false;
    };
  }, [loadJeepneys, loadAvailableDrivers]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-jeepneys-management")

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jeepneys",
        },
        async () => {
          await loadJeepneys();
          await loadAvailableDrivers();
        },
      )

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
        },
        async () => {
          await loadJeepneys();
          await loadAvailableDrivers();
        },
      )

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "jeepneys",
        },
        async () => {
          await loadJeepneys();
          await loadAvailableDrivers();
        },
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        async () => {
          await loadJeepneys();
        },
      )

      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [loadJeepneys, loadAvailableDrivers]);

  return {
    jeepneys,
    availableDrivers,

    loading,
    refreshing,
    driversLoading,

    error,
    driversError,

    refresh,
    loadAvailableDrivers,

    addJeepney,
  };
}
