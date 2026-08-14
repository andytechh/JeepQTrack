// src/shared/hooks/useCommuterDashboard.ts

import { supabase } from "@/src/shared/config/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotifications } from "./useNotification";

/* ============================================================
   TYPES
============================================================ */

export interface CommuterProfile {
  id: string;
  display_name: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
}

export interface CommuterDashboardJeepney {
  id: string;
  plate_number: string;

  bracket: number | null;

  status:
    | "waiting"
    | "loading"
    | "en_route"
    | "arrived"
    | "dispatched"
    | "inactive"
    | string;

  queue_position: number | null;

  terminal_id: number | null;

  current_occupancy: number;
  capacity: number;

  driver_name: string | null;

  loading_started_at: string | null;
  loading_ends_at: string | null;

  departure_time: string | null;
  departed_at: string | null;

  entered_geofence_at: string | null;

  latitude: number | null;
  longitude: number | null;

  current_latitude: number | null;
  current_longitude: number | null;

  last_location_update: string | null;

  last_occupancy_update: string | null;

  last_queue_update: string | null;

  created_at: string | null;
  updated_at: string | null;
}

export interface QueueActivity {
  id: string;
  jeepneyId: string;
  plateNumber: string;

  status: string;

  queuePosition: number | null;

  terminalId: number | null;

  timestamp: string;
}

/* ============================================================
   RETURN TYPE
============================================================ */

export interface UseCommuterDashboardReturn {
  profile: CommuterProfile | null;

  jeepneys: CommuterDashboardJeepney[];

  nextJeepney: CommuterDashboardJeepney | null;

  queueCount: number;

  totalPassengers: number;

  availableSeats: number;

  activities: QueueActivity[];

  notifications: ReturnType<typeof useNotifications>["notifications"];

  unreadNotificationCount: number;

  loading: boolean;

  refreshing: boolean;

  error: string | null;

  lastUpdated: Date | null;

  refresh: () => Promise<void>;

  markNotificationAsRead: (notificationId: string) => Promise<boolean>;

  terminalNames: Record<number, string>;
}

/* ============================================================
   CONSTANTS
============================================================ */

const TERMINAL_NAMES: Record<number, string> = {
  1: "Donsol",
  2: "Daraga",
};

/*
 * IMPORTANT
 *
 * The jeepneys table is the SINGLE SOURCE OF TRUTH
 * for the commuter queue.
 *
 * We DO NOT use:
 *
 * public.queue
 * public.terminals
 * queue_entries
 *
 * Queue order comes from:
 *
 * jeepneys.queue_position
 *
 * Queue status comes from:
 *
 * jeepneys.status
 */

const ACTIVE_QUEUE_STATUSES = ["waiting", "loading"];

/* ============================================================
   HELPERS
============================================================ */

function isActiveQueueJeepney(jeepney: CommuterDashboardJeepney): boolean {
  return (
    jeepney.queue_position !== null &&
    jeepney.queue_position > 0 &&
    ACTIVE_QUEUE_STATUSES.includes(jeepney.status)
  );
}

/* ============================================================
   SORT QUEUE
============================================================ */

function sortQueue(
  items: CommuterDashboardJeepney[],
): CommuterDashboardJeepney[] {
  return [...items].sort((a, b) => {
    /*
     * First sort by terminal.
     *
     * Donsol = 1
     * Daraga = 2
     */
    const terminalA = a.terminal_id ?? 999;
    const terminalB = b.terminal_id ?? 999;

    if (terminalA !== terminalB) {
      return terminalA - terminalB;
    }

    /*
     * Then queue position.
     */
    const positionA = a.queue_position ?? 999999;
    const positionB = b.queue_position ?? 999999;

    return positionA - positionB;
  });
}

/* ============================================================
   GET CURRENT USER
============================================================ */

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn("Unable to get authenticated user:", error.message);

      return null;
    }

    return user?.id ?? null;
  } catch (error) {
    console.warn("getAuthenticatedUserId exception:", error);

    return null;
  }
}

/* ============================================================
   HOOK
============================================================ */

export function useCommuterDashboard(): UseCommuterDashboardReturn {
  const [profile, setProfile] = useState<CommuterProfile | null>(null);

  const [jeepneys, setJeepneys] = useState<CommuterDashboardJeepney[]>([]);

  const [activities, setActivities] = useState<QueueActivity[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /* ==========================================================
     CURRENT USER ID

     Notifications now come entirely from useNotifications,
     which needs a userId to key its own realtime channel and
     query. We track it locally here (and keep it in sync with
     auth state) instead of re-fetching it ad hoc.
  ========================================================== */

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getAuthenticatedUserId().then((id) => {
      if (mounted) {
        setUserId(id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ==========================================================
     NOTIFICATIONS

     Single source of truth shared with the notifications
     screen. Handles its own realtime channel safely (unique
     per hook instance), so the dashboard bell badge and the
     notifications list always agree.
  ========================================================== */

  const {
    notifications,
    unreadCount: unreadNotificationCount,
    markAsRead: markNotificationAsRead,
  } = useNotifications(userId);

  /* ==========================================================
     LOAD PROFILE
  ========================================================== */

  const loadProfile = useCallback(
    async (userId: string): Promise<CommuterProfile | null> => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, display_name, phone_number, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.warn("Profile fetch error:", error.message);

          return null;
        }

        if (!data) {
          return null;
        }

        return {
          id: data.id,
          display_name: data.display_name ?? null,
          phone_number: data.phone_number ?? null,
          avatar_url: data.avatar_url ?? null,
        };
      } catch (error) {
        console.warn("loadProfile exception:", error);

        return null;
      }
    },
    [],
  );

  /* ==========================================================
     LOAD JEEPNEY QUEUE
     
     SOURCE:
     
     public.jeepneys
     
     IMPORTANT:
     
     queue_position is stored directly on jeepneys.
  ========================================================== */

  const loadQueue = useCallback(async (): Promise<
    CommuterDashboardJeepney[]
  > => {
    try {
      const { data, error } = await supabase
        .from("jeepneys")
        .select(
          `
              id,
              plate_number,
              bracket,
              status,
              current_occupancy,
              last_occupancy_update,
              queue_position,
              departure_time,
              eta,

              current_latitude,
              current_longitude,
              last_location_update,

              latitude,
              longitude,

              last_queue_update,
              entered_geofence_at,

              loading_started_at,
              loading_ends_at,
              departed_at,

              jeep_name,
              driver_name,
              driver_id,

              terminal_id,

              created_at,
              updated_at,

              capacity
            `,
        )
        .in("terminal_id", [1, 2])
        .in("status", ACTIVE_QUEUE_STATUSES)
        .not("queue_position", "is", null)
        .gt("queue_position", 0)
        .order("terminal_id", {
          ascending: true,
        })
        .order("queue_position", {
          ascending: true,
        });

      if (error) {
        console.error("Failed to load commuter queue:", error);

        throw error;
      }

      if (!data) {
        return [];
      }

      const result: CommuterDashboardJeepney[] = data.map((jeepney) => ({
        id: jeepney.id,

        plate_number: jeepney.plate_number ?? "Unknown",

        bracket: jeepney.bracket ?? null,

        status: jeepney.status ?? "inactive",

        queue_position: jeepney.queue_position ?? null,

        terminal_id: jeepney.terminal_id ?? null,

        current_occupancy: jeepney.current_occupancy ?? 0,

        capacity: jeepney.capacity ?? 0,

        driver_name: jeepney.driver_name ?? null,

        loading_started_at: jeepney.loading_started_at ?? null,

        loading_ends_at: jeepney.loading_ends_at ?? null,

        departure_time: jeepney.departure_time ?? null,

        departed_at: jeepney.departed_at ?? null,

        entered_geofence_at: jeepney.entered_geofence_at ?? null,

        latitude: jeepney.latitude ?? null,

        longitude: jeepney.longitude ?? null,

        current_latitude: jeepney.current_latitude ?? null,

        current_longitude: jeepney.current_longitude ?? null,

        last_location_update: jeepney.last_location_update ?? null,

        last_occupancy_update: jeepney.last_occupancy_update ?? null,

        last_queue_update: jeepney.last_queue_update ?? null,

        created_at: jeepney.created_at ?? null,

        updated_at: jeepney.updated_at ?? null,
      }));

      return sortQueue(result.filter(isActiveQueueJeepney));
    } catch (error) {
      console.error("loadQueue exception:", error);

      throw error;
    }
  }, []);

  /* ==========================================================
     LOAD RECENT QUEUE ACTIVITY
     
     IMPORTANT:
     
     There is NO queue history table being used here.
     
     We derive recent activity from jeepneys.updated_at
     and their current queue/status fields.
  ========================================================== */

  const loadActivities = useCallback(async (): Promise<QueueActivity[]> => {
    try {
      const { data, error } = await supabase
        .from("jeepneys")
        .select(
          `
              id,
              plate_number,
              status,
              queue_position,
              terminal_id,
              updated_at,
              last_queue_update,
              loading_started_at,
              departed_at,
              created_at
            `,
        )
        .in("terminal_id", [1, 2])
        .order("updated_at", {
          ascending: false,
        })
        .limit(10);

      if (error) {
        console.warn("Activity jeepney error:", error.message);

        return [];
      }

      if (!data) {
        return [];
      }

      return data
        .map((jeepney) => {
          const timestamp =
            jeepney.last_queue_update ??
            jeepney.loading_started_at ??
            jeepney.departed_at ??
            jeepney.updated_at ??
            jeepney.created_at ??
            new Date().toISOString();

          return {
            id: jeepney.id,

            jeepneyId: jeepney.id,

            plateNumber: jeepney.plate_number,

            status: jeepney.status,

            queuePosition: jeepney.queue_position ?? null,

            terminalId: jeepney.terminal_id ?? null,

            timestamp,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
    } catch (error) {
      console.warn("loadActivities exception:", error);

      return [];
    }
  }, []);

  /* ==========================================================
     LOAD DASHBOARD

     Notifications are intentionally NOT loaded here anymore —
     useNotifications owns that data and its own realtime
     channel. Loading it here too was both duplicating fetches
     and creating a second realtime channel with a colliding
     name (commuter-notifications-${userId}), which is what
     caused the "cannot add postgres_changes callbacks after
     subscribe()" crash whenever this hook and the notifications
     screen were mounted at the same time.
  ========================================================== */

  const loadDashboard = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const currentUserId = await getAuthenticatedUserId();

        const [profileResult, queueResult, activityResult] = await Promise.all([
          currentUserId ? loadProfile(currentUserId) : Promise.resolve(null),

          loadQueue(),

          loadActivities(),
        ]);

        setProfile(profileResult);

        setJeepneys(queueResult);

        setActivities(activityResult);

        setLastUpdated(new Date());
      } catch (error: any) {
        console.error("Failed to load dashboard:", error);

        setError(error?.message ?? "Unable to load Smart Queue dashboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadProfile, loadQueue, loadActivities],
  );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  /* ==========================================================
     REALTIME JEEPNEY QUEUE
     
     This is the important realtime listener.
  ========================================================== */

  useEffect(() => {
    const channel = supabase
      .channel("commuter-dashboard-jeepneys")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
        },
        () => {
          loadDashboard(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  /* ==========================================================
     COMPUTED QUEUE COUNT
  ========================================================== */

  const queueCount = useMemo(() => {
    return jeepneys.filter(isActiveQueueJeepney).length;
  }, [jeepneys]);

  /* ==========================================================
     TOTAL PASSENGERS
     
     This is NOT a passenger queue.
     
     It is simply the combined occupancy
     currently reported by queued jeepneys.
  ========================================================== */

  const totalPassengers = useMemo(() => {
    return jeepneys.reduce(
      (total, jeepney) => total + Math.max(0, jeepney.current_occupancy ?? 0),
      0,
    );
  }, [jeepneys]);

  /* ==========================================================
     AVAILABLE SEATS
     
     Kept for compatibility with your current dashboard.
     
     This is NOT "passenger queue availability".
     
     It is simply unused capacity across queued jeepneys.
  ========================================================== */

  const availableSeats = useMemo(() => {
    return jeepneys.reduce((total, jeepney) => {
      const capacity = jeepney.capacity ?? 0;

      const occupancy = jeepney.current_occupancy ?? 0;

      return total + Math.max(0, capacity - occupancy);
    }, 0);
  }, [jeepneys]);

  /* ==========================================================
     NEXT JEEPNEY
     
     Since the array is sorted:
     
     terminal 1 → queue position
     terminal 2 → queue position
     
     The first active jeepney is the next
     jeepney in the combined system.
  ========================================================== */

  const nextJeepney = jeepneys.length > 0 ? jeepneys[0] : null;

  /* ==========================================================
     REFRESH

     Refreshes both dashboard data (profile/queue/activity) and
     notifications, so pull-to-refresh on the dashboard updates
     the bell badge too.
  ========================================================== */

  const refresh = useCallback(async () => {
    await loadDashboard(true);
  }, [loadDashboard]);

  /* ==========================================================
     RETURN
  ========================================================== */

  return {
    profile,

    jeepneys,

    nextJeepney,

    queueCount,

    totalPassengers,

    availableSeats,

    activities,

    notifications,

    unreadNotificationCount,

    loading,

    refreshing,

    error,

    lastUpdated,

    refresh,

    markNotificationAsRead,

    terminalNames: TERMINAL_NAMES,
  };
}
