import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "../../config/supabase";

import { calculateJeepneyEta } from "../../utils/routeEta";

import {
  getOutsideHoursMessage,
  isWithinOperatingHours,
} from "../../utils/operatingHours";

export type JeepneyStatus =
  "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";

export interface AdminQueueJeepney {
  id: string;
  plate_number: string;
  bracket: number;
  capacity: number | null;
  status: JeepneyStatus;

  current_occupancy: number | null;
  last_occupancy_update: string | null;

  queue_position: number | null;

  departure_time: string | null;

  eta: number | null;

  jeep_name: string | null;
  driver_name: string | null;
  driver_id: string | null;

  terminal_id: number | null;

  loading_ends_at: string | null;
  departed_at: string | null;

  updated_at: string | null;

  /*
   * Timestamp of this jeepney's most recent GPS ping.
   *
   * Informational only.
   */
  last_gps_at: string | null;
}

export type QueueTerminal = "all" | 1 | 2;

interface UseAdminQueueResult {
  jeepneys: AdminQueueJeepney[];

  loadingJeepney: AdminQueueJeepney | null;

  waitingJeepneys: AdminQueueJeepney[];

  enRouteJeepneys: AdminQueueJeepney[];

  arrivedJeepneys: AdminQueueJeepney[];

  activeJeepneys: AdminQueueJeepney[];

  totalWaiting: number;

  terminal: QueueTerminal;

  setTerminal: (terminal: QueueTerminal) => void;

  loading: boolean;

  refreshing: boolean;

  error: string | null;

  refresh: () => Promise<void>;

  isOperatingHours: boolean;

  operatingHoursMessage: string;
}

interface DoorCountRow {
  id: string;
  jeep_id: string | null;
  front_count: number | null;
  rear_count: number | null;
  updated_at: string | null;
}

const QUEUE_COLUMNS = `
  id,
  plate_number,
  bracket,
  capacity,
  status,
  current_occupancy,
  last_occupancy_update,
  queue_position,
  departure_time,
  eta,
  jeep_name,
  driver_name,
  driver_id,
  terminal_id,
  loading_ends_at,
  departed_at,
  updated_at
`;

const ETA_REFRESH_INTERVAL_MS = 25000;

export function useAdminQueue(): UseAdminQueueResult {
  const [jeepneys, setJeepneys] = useState<AdminQueueJeepney[]>([]);

  const [terminal, setTerminal] = useState<QueueTerminal>("all");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isOperatingHours, setIsOperatingHours] = useState(() =>
    isWithinOperatingHours(),
  );

  const [operatingHoursMessage, setOperatingHoursMessage] = useState(() =>
    getOutsideHoursMessage(),
  );

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const realtimeInstanceRef = useRef(0);

  /*
   * --------------------------------------------------------------
   * LOAD LATEST DOOR COUNTS
   * --------------------------------------------------------------
   *
   * door_counts can have multiple records for one jeepney.
   *
   * We order newest first and keep only the newest row for
   * each jeepney.
   */
  const loadDoorCounts = useCallback(async (jeepneyIds: string[]) => {
    if (jeepneyIds.length === 0) {
      return new Map<string, DoorCountRow>();
    }

    const { data, error: doorCountError } = await supabase
      .from("door_counts")
      .select("id, jeep_id, front_count, rear_count, updated_at")
      .in("jeep_id", jeepneyIds)
      .order("updated_at", {
        ascending: false,
      });

    if (doorCountError) {
      console.error(
        "❌ Admin queue door_counts lookup failed:",
        doorCountError,
      );

      return new Map<string, DoorCountRow>();
    }

    const latestByJeepId = new Map<string, DoorCountRow>();

    (data ?? []).forEach((row: DoorCountRow) => {
      if (!row.jeep_id) {
        return;
      }

      /*
       * Newest row wins.
       */
      if (!latestByJeepId.has(row.jeep_id)) {
        latestByJeepId.set(row.jeep_id, row);
      }
    });

    return latestByJeepId;
  }, []);

  /*
   * --------------------------------------------------------------
   * ETA
   * --------------------------------------------------------------
   */
  const attachEtas = useCallback(async (list: AdminQueueJeepney[]) => {
    const enRoute = list.filter(
      (j) =>
        (j.status === "en_route" || j.status === "dispatched") &&
        j.terminal_id != null,
    );

    if (enRoute.length === 0) {
      return;
    }

    try {
      const ids = enRoute.map((j) => j.id);

      const { data: gpsRows, error: gpsError } = await supabase
        .from("latest_gps_tracking")
        .select("jeepney_id, latitude, longitude, speed")
        .in("jeepney_id", ids);

      if (gpsError) {
        console.error("❌ Admin queue GPS lookup for ETA failed:", gpsError);

        return;
      }

      const gpsByJeepneyId = new Map<
        string,
        {
          lat: number;
          lng: number;
          speed: number;
        }
      >();

      (gpsRows || []).forEach((row: any) => {
        const lat = Number(row.latitude);

        const lng = Number(row.longitude);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          gpsByJeepneyId.set(row.jeepney_id, {
            lat,
            lng,
            speed: Number(row.speed || 0),
          });
        }
      });

      const results = await Promise.all(
        enRoute.map(async (j) => {
          const gps = gpsByJeepneyId.get(j.id);

          if (!gps || j.terminal_id == null) {
            return {
              id: j.id,
              etaMinutes: null,
            };
          }

          const eta = await calculateJeepneyEta(
            gps.lat,
            gps.lng,
            j.terminal_id,
            gps.speed,
          );

          if (!eta) {
            return {
              id: j.id,
              etaMinutes: null,
            };
          }

          return {
            id: j.id,
            etaMinutes: Math.round(eta.remainingMinutes),
          };
        }),
      );

      setJeepneys((current) =>
        current.map((j) => {
          const result = results.find((r) => r.id === j.id);

          return result && result.etaMinutes !== null
            ? {
                ...j,
                eta: result.etaMinutes,
              }
            : j;
        }),
      );
    } catch (err) {
      console.error("❌ Admin queue: unexpected error attaching ETAs:", err);
    }
  }, []);

  /*
   * --------------------------------------------------------------
   * LOAD QUEUE
   * --------------------------------------------------------------
   */
  const loadQueue = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const { data, error: fetchError } = await supabase
          .from("jeepneys")
          .select(QUEUE_COLUMNS)
          .in("status", [
            "waiting",
            "loading",
            "en_route",
            "dispatched",
            "arrived",
          ])
          .order("queue_position", {
            ascending: true,
            nullsFirst: false,
          });

        if (fetchError) {
          console.error("❌ Admin queue fetch error:", fetchError);

          setError(fetchError.message);

          return;
        }

        const rawRows = (data ?? []) as Array<
          Omit<AdminQueueJeepney, "last_gps_at">
        >;

        const ids = rawRows.map((row) => row.id);

        /*
         * --------------------------------------------------------
         * GPS
         * --------------------------------------------------------
         */
        let lastGpsById = new Map<string, string>();

        if (ids.length > 0) {
          const { data: gpsRows, error: gpsError } = await supabase
            .from("latest_gps_tracking")
            .select("jeepney_id, recorded_at")
            .in("jeepney_id", ids);

          if (gpsError) {
            console.error("❌ Admin queue GPS lookup failed:", gpsError);
          } else {
            gpsRows?.forEach((row: any) => {
              if (!row.jeepney_id) {
                return;
              }

              lastGpsById.set(row.jeepney_id, row.recorded_at);
            });
          }
        }

        /*
         * --------------------------------------------------------
         * DOOR COUNTS
         * --------------------------------------------------------
         */
        const latestDoorCounts = await loadDoorCounts(ids);

        /*
         * --------------------------------------------------------
         * OPERATING HOURS
         * --------------------------------------------------------
         *
         * - arrived stays as history
         * - live queue requires operating hours + GPS
         * - database is never mutated here
         */
        const currentlyOperating = isWithinOperatingHours();

        const rows: AdminQueueJeepney[] = rawRows
          .map((row) => {
            const doorCount = latestDoorCounts.get(row.id);

            const doorTotal =
              doorCount != null
                ? Number(doorCount.front_count ?? 0) +
                  Number(doorCount.rear_count ?? 0)
                : Number(row.current_occupancy ?? 0);

            return {
              ...row,

              /*
               * Direct live passenger total.
               */
              current_occupancy: doorTotal,

              last_occupancy_update:
                doorCount?.updated_at ?? row.last_occupancy_update ?? null,

              last_gps_at: lastGpsById.get(row.id) ?? null,
            };
          })
          .filter((row) =>
            row.status === "arrived"
              ? true
              : currentlyOperating
                ? row.last_gps_at !== null
                : false,
          );

        setJeepneys(rows);

        setLoading(false);

        setRefreshing(false);

        await attachEtas(rows);
      } catch (err: any) {
        console.error("❌ Admin queue load exception:", err);

        setError(err?.message ?? "Unable to load queue.");

        setLoading(false);

        setRefreshing(false);
      }
    },
    [attachEtas, loadDoorCounts],
  );

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  /*
   * --------------------------------------------------------------
   * OPERATING HOURS
   * --------------------------------------------------------------
   */
  useEffect(() => {
    let previousOperatingHours = isWithinOperatingHours();

    const tick = () => {
      const nextOperatingHours = isWithinOperatingHours();

      setIsOperatingHours(nextOperatingHours);

      setOperatingHoursMessage(getOutsideHoursMessage());

      if (nextOperatingHours !== previousOperatingHours) {
        previousOperatingHours = nextOperatingHours;

        loadQueue();
      }
    };

    tick();

    const interval = setInterval(tick, 60 * 1000);

    return () => clearInterval(interval);
  }, [loadQueue]);

  /*
   * --------------------------------------------------------------
   * ETA REFRESH
   * --------------------------------------------------------------
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setJeepneys((current) => {
        void attachEtas(current);
        return current;
      });
    }, ETA_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [attachEtas]);

  /*
   * --------------------------------------------------------------
   * REALTIME
   * --------------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    const instanceId = ++realtimeInstanceRef.current;

    const channelName = `admin-jeepneys-queue-${instanceId}`;

    console.log("📡 Starting admin queue realtime subscription:", channelName);

    const channel = supabase
      .channel(channelName)

      /*
       * ----------------------------------------------------------
       * JEEPNEY INSERT
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const incoming = payload.new as Omit<
            AdminQueueJeepney,
            "last_gps_at"
          >;

          if (!isWithinOperatingHours()) {
            return;
          }

          void (async () => {
            const { data: gpsRow, error: gpsError } = await supabase
              .from("latest_gps_tracking")
              .select("recorded_at")
              .eq("jeepney_id", incoming.id)
              .maybeSingle();

            if (cancelled || gpsError || !gpsRow) {
              return;
            }

            const { data: doorRows } = await supabase
              .from("door_counts")
              .select("id, jeep_id, front_count, rear_count, updated_at")
              .eq("jeep_id", incoming.id)
              .order("updated_at", {
                ascending: false,
              })
              .limit(1);

            const doorCount = doorRows?.[0] as DoorCountRow | undefined;

            const total =
              doorCount != null
                ? Number(doorCount.front_count ?? 0) +
                  Number(doorCount.rear_count ?? 0)
                : Number(incoming.current_occupancy ?? 0);

            const jeepney: AdminQueueJeepney = {
              ...incoming,

              current_occupancy: total,

              last_occupancy_update:
                doorCount?.updated_at ?? incoming.last_occupancy_update ?? null,

              last_gps_at: gpsRow.recorded_at ?? null,
            };

            setJeepneys((current) => {
              const exists = current.some((item) => item.id === incoming.id);

              return exists
                ? current.map((item) =>
                    item.id === incoming.id ? jeepney : item,
                  )
                : [...current, jeepney];
            });

            await attachEtas([jeepney]);
          })();
        },
      )

      /*
       * ----------------------------------------------------------
       * JEEPNEY UPDATE
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const updated = payload.new as Omit<AdminQueueJeepney, "last_gps_at">;

          /*
           * Inactive jeepneys are removed from the live queue.
           */
          if (updated.status === "inactive") {
            setJeepneys((current) =>
              current.filter((jeepney) => jeepney.id !== updated.id),
            );

            return;
          }

          /*
           * Arrived jeepneys remain visible as queue history.
           */
          if (updated.status === "arrived") {
            setJeepneys((current) => {
              const existing = current.find((item) => item.id === updated.id);

              if (!existing) {
                return [
                  ...current,
                  {
                    ...updated,
                    last_gps_at: null,
                  },
                ];
              }

              return current.map((item) =>
                item.id === updated.id
                  ? {
                      ...updated,
                      last_gps_at: existing.last_gps_at,
                    }
                  : item,
              );
            });

            return;
          }

          /*
           * Outside operating hours, live queue entries disappear.
           */
          if (!isWithinOperatingHours()) {
            setJeepneys((current) =>
              current.filter((jeepney) => jeepney.id !== updated.id),
            );

            return;
          }

          void (async () => {
            const { data: gpsRow, error: gpsError } = await supabase
              .from("latest_gps_tracking")
              .select("recorded_at")
              .eq("jeepney_id", updated.id)
              .maybeSingle();

            if (cancelled) {
              return;
            }

            if (gpsError || !gpsRow) {
              setJeepneys((current) =>
                current.filter((jeepney) => jeepney.id !== updated.id),
              );

              return;
            }

            /*
             * Get the latest door count for this jeepney.
             */
            const { data: doorRows, error: doorError } = await supabase
              .from("door_counts")
              .select("id, jeep_id, front_count, rear_count, updated_at")
              .eq("jeep_id", updated.id)
              .order("updated_at", {
                ascending: false,
              })
              .limit(1);

            if (cancelled) {
              return;
            }

            if (doorError) {
              console.error(
                "❌ Admin queue door count lookup failed:",
                doorError,
              );
            }

            const doorCount = doorRows?.[0] as DoorCountRow | undefined;

            const total =
              doorCount != null
                ? Number(doorCount.front_count ?? 0) +
                  Number(doorCount.rear_count ?? 0)
                : Number(updated.current_occupancy ?? 0);

            const jeepney: AdminQueueJeepney = {
              ...updated,

              current_occupancy: total,

              last_occupancy_update:
                doorCount?.updated_at ?? updated.last_occupancy_update ?? null,

              last_gps_at: gpsRow.recorded_at ?? null,
            };

            setJeepneys((current) => {
              const exists = current.some((item) => item.id === updated.id);

              return exists
                ? current.map((item) =>
                    item.id === updated.id ? jeepney : item,
                  )
                : [...current, jeepney];
            });

            await attachEtas([jeepney]);
          })();
        },
      )

      /*
       * ----------------------------------------------------------
       * JEEPNEY DELETE
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "jeepneys",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const deleted = payload.old as Partial<AdminQueueJeepney>;

          if (!deleted.id) {
            return;
          }

          console.log("🗑️ Jeepney removed:", deleted.id);

          setJeepneys((current) =>
            current.filter((jeepney) => jeepney.id !== deleted.id),
          );
        },
      )

      /*
       * ----------------------------------------------------------
       * DOOR COUNT INSERT
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "door_counts",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const doorCount = payload.new as DoorCountRow;

          if (!doorCount.jeep_id) {
            return;
          }

          const total =
            Number(doorCount.front_count ?? 0) +
            Number(doorCount.rear_count ?? 0);

          const updatedAt = doorCount.updated_at ?? new Date().toISOString();

          console.log("🚪 Queue door count INSERT:", {
            jeep_id: doorCount.jeep_id,
            front_count: doorCount.front_count,
            rear_count: doorCount.rear_count,
            total,
          });

          setJeepneys((current) =>
            current.map((jeepney) =>
              jeepney.id === doorCount.jeep_id
                ? {
                    ...jeepney,
                    current_occupancy: total,
                    last_occupancy_update: updatedAt,
                  }
                : jeepney,
            ),
          );
        },
      )

      /*
       * ----------------------------------------------------------
       * DOOR COUNT UPDATE
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "door_counts",
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const doorCount = payload.new as DoorCountRow;

          if (!doorCount.jeep_id) {
            return;
          }

          const total =
            Number(doorCount.front_count ?? 0) +
            Number(doorCount.rear_count ?? 0);

          const updatedAt = doorCount.updated_at ?? new Date().toISOString();

          console.log("🚪 Queue door count UPDATE:", {
            jeep_id: doorCount.jeep_id,
            front_count: doorCount.front_count,
            rear_count: doorCount.rear_count,
            total,
          });

          setJeepneys((current) =>
            current.map((jeepney) =>
              jeepney.id === doorCount.jeep_id
                ? {
                    ...jeepney,
                    current_occupancy: total,
                    last_occupancy_update: updatedAt,
                  }
                : jeepney,
            ),
          );
        },
      )

      /*
       * ----------------------------------------------------------
       * GPS INSERT
       * ----------------------------------------------------------
       */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        (payload) => {
          if (cancelled || !isWithinOperatingHours()) {
            return;
          }

          const gps = payload.new as any;

          const jeepneyId = String(gps.jeepney_id);

          const recordedAt = gps.recorded_at ?? new Date().toISOString();

          void (async () => {
            const { data: jeepneyRow, error: jeepneyError } = await supabase
              .from("jeepneys")
              .select(QUEUE_COLUMNS)
              .eq("id", jeepneyId)
              .maybeSingle();

            if (cancelled || jeepneyError || !jeepneyRow) {
              return;
            }

            const status = jeepneyRow.status as JeepneyStatus;

            if (status === "inactive" || status === "arrived") {
              return;
            }

            /*
             * Get current door count when a new GPS record causes
             * a jeepney to enter/update the queue.
             */
            const { data: doorRows } = await supabase
              .from("door_counts")
              .select("id, jeep_id, front_count, rear_count, updated_at")
              .eq("jeep_id", jeepneyId)
              .order("updated_at", {
                ascending: false,
              })
              .limit(1);

            if (cancelled) {
              return;
            }

            const doorCount = doorRows?.[0] as DoorCountRow | undefined;

            const total =
              doorCount != null
                ? Number(doorCount.front_count ?? 0) +
                  Number(doorCount.rear_count ?? 0)
                : Number(jeepneyRow.current_occupancy ?? 0);

            const jeepney: AdminQueueJeepney = {
              ...(jeepneyRow as Omit<AdminQueueJeepney, "last_gps_at">),

              current_occupancy: total,

              last_occupancy_update:
                doorCount?.updated_at ??
                jeepneyRow.last_occupancy_update ??
                null,

              last_gps_at: recordedAt,
            };

            setJeepneys((current) => {
              const exists = current.some((item) => item.id === jeepneyId);

              return exists
                ? current.map((item) =>
                    item.id === jeepneyId
                      ? {
                          ...item,
                          ...jeepney,
                        }
                      : item,
                  )
                : [...current, jeepney];
            });

            await attachEtas([jeepney]);
          })();
        },
      )

      .subscribe((status, err) => {
        if (cancelled) {
          return;
        }

        console.log("📡 Admin queue realtime:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Admin queue realtime connected");
        }

        if (status === "CHANNEL_ERROR") {
          console.error("❌ Admin queue realtime channel error:", err);
        }

        if (status === "TIMED_OUT") {
          console.error("⏱️ Admin queue realtime timed out:", err);
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      console.log("📡 Removing admin queue realtime:", channelName);

      void supabase.removeChannel(channel);
    };
  }, [attachEtas]);

  /*
   * --------------------------------------------------------------
   * TERMINAL FILTER
   * --------------------------------------------------------------
   */
  const filteredJeepneys = useMemo(() => {
    if (terminal === "all") {
      return jeepneys;
    }

    return jeepneys.filter((jeepney) => jeepney.terminal_id === terminal);
  }, [jeepneys, terminal]);

  /*
   * Current loading jeepney.
   */
  const loadingJeepney = useMemo(() => {
    return (
      filteredJeepneys.find(
        (jeepney) =>
          jeepney.status === "loading" && jeepney.queue_position === 1,
      ) ?? null
    );
  }, [filteredJeepneys]);

  /*
   * Waiting queue.
   */
  const waitingJeepneys = useMemo(() => {
    return filteredJeepneys
      .filter(
        (jeepney) =>
          jeepney.status === "waiting" && jeepney.queue_position !== null,
      )
      .sort((a, b) => {
        return (
          (a.queue_position ?? Number.MAX_SAFE_INTEGER) -
          (b.queue_position ?? Number.MAX_SAFE_INTEGER)
        );
      });
  }, [filteredJeepneys]);

  /*
   * En-route jeepneys.
   */
  const enRouteJeepneys = useMemo(() => {
    return filteredJeepneys
      .filter(
        (jeepney) =>
          jeepney.status === "en_route" || jeepney.status === "dispatched",
      )
      .sort((a, b) => {
        const aTime = a.departure_time
          ? new Date(a.departure_time).getTime()
          : 0;

        const bTime = b.departure_time
          ? new Date(b.departure_time).getTime()
          : 0;

        return bTime - aTime;
      });
  }, [filteredJeepneys]);

  /*
   * Arrived jeepneys / queue history.
   */
  const arrivedJeepneys = useMemo(() => {
    return filteredJeepneys
      .filter((jeepney) => jeepney.status === "arrived")
      .sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;

        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;

        return bTime - aTime;
      });
  }, [filteredJeepneys]);

  /*
   * Active jeepneys.
   */
  const activeJeepneys = useMemo(() => {
    return filteredJeepneys.filter(
      (jeepney) => jeepney.status === "waiting" || jeepney.status === "loading",
    );
  }, [filteredJeepneys]);

  const refresh = useCallback(async () => {
    await loadQueue(true);
  }, [loadQueue]);

  return {
    jeepneys: filteredJeepneys,

    loadingJeepney,

    waitingJeepneys,

    enRouteJeepneys,

    arrivedJeepneys,

    activeJeepneys,

    totalWaiting: waitingJeepneys.length,

    terminal,

    setTerminal,

    loading,

    refreshing,

    error,

    refresh,

    isOperatingHours,

    operatingHoursMessage,
  };
}
