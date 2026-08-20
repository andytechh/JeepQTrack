import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../config/supabase";

export type MonitoringPeriod = "today" | "7d" | "30d" | "all";

export interface ActivityLogRecord {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: Record<string, any> | null;
  terminal_id: 1 | 2 | null;
  jeepney_id: string | null;
  created_at: string;

  user_name: string;
  jeepney_name: string;
  jeepney_plate: string;
}

export interface TripMonitoringRecord {
  id: string;
  jeepney_id: string | null;
  driver_id: string | null;
  dispatcher_id: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  occupancy_at_departure: number;
  route: string;
  total_passengers: number;
  trip_duration: number | null;
  created_at: string;
  updated_at: string;
  status: string;
  loading_duration_seconds: number | null;

  jeepney_name: string;
  plate_number: string;
  driver_name: string;
  dispatcher_name: string;
}

export interface MonitoringStats {
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  totalPassengers: number;
  averagePassengers: number;
  averageTripDuration: number;
  averageLoadingDuration: number;
  activeJeepneys: number;
  totalJeepneys: number;
  activeStaff: number;
  totalStaff: number;
  drivers: number;
  dispatchers: number;
  admins: number;
  totalActivityLogs: number;
}

export interface TerminalMonitoringStats {
  terminalNumber: 1 | 2;
  terminalName: string;
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  totalPassengers: number;
  averagePassengers: number;
  averageTripDuration: number;
  activityCount: number;
  activeJeepneys: number;
}

export interface StaffMonitoringStats {
  total: number;
  active: number;
  inactive: number;
  drivers: number;
  dispatchers: number;
  admins: number;
}

export interface JeepneyMonitoringStats {
  id: string;
  name: string;
  plateNumber: string;
  terminalId: 1 | 2 | null;
  status: string;
  totalTrips: number;
  totalPassengers: number;
  averagePassengers: number;
  averageTripDuration: number;
}

export interface DailyTripStats {
  date: string;
  trips: number;
  passengers: number;
  completedTrips: number;
}

export interface DailyActivityStats {
  date: string;
  count: number;
}

export interface ActionStats {
  action: string;
  count: number;
}

export interface MonitoringResult {
  activityLogs: ActivityLogRecord[];
  trips: TripMonitoringRecord[];
  stats: MonitoringStats;
  terminalStats: TerminalMonitoringStats[];
  staffStats: StaffMonitoringStats;
  jeepneyStats: JeepneyMonitoringStats[];
  dailyTrips: DailyTripStats[];
  dailyActivity: DailyActivityStats[];
  actionStats: ActionStats[];

  loading: boolean;
  refreshing: boolean;
  error: string | null;

  period: MonitoringPeriod;
  setPeriod: (period: MonitoringPeriod) => void;

  refresh: () => Promise<void>;
}

interface UserRecord {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
}

interface JeepneyRecord {
  id: string;
  jeep_name: string | null;
  plate_number: string;
  terminal_id: number | null;
  status: string | null;
  is_active?: boolean | null;
}

interface TerminalRecord {
  id: string;
  terminal_number: 1 | 2;
  name: string;
  is_active: boolean;
}

interface TripRecord {
  id: string;
  jeepney_id: string | null;
  driver_id: string | null;
  dispatcher_id: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  occupancy_at_departure: number | null;
  route: string | null;
  total_passengers: number | null;
  trip_duration: number | null;
  created_at: string | null;
  updated_at: string | null;
  status: string | null;
  loading_duration_seconds: number | null;
}

interface ActivityLogRaw {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: Record<string, any> | null;
  terminal_id: number | null;
  jeepney_id: string | null;
  created_at: string;
}

const EMPTY_STATS: MonitoringStats = {
  totalTrips: 0,
  completedTrips: 0,
  activeTrips: 0,
  totalPassengers: 0,
  averagePassengers: 0,
  averageTripDuration: 0,
  averageLoadingDuration: 0,
  activeJeepneys: 0,
  totalJeepneys: 0,
  activeStaff: 0,
  totalStaff: 0,
  drivers: 0,
  dispatchers: 0,
  admins: 0,
  totalActivityLogs: 0,
};

function getPeriodStart(period: MonitoringPeriod): string | null {
  if (period === "all") {
    return null;
  }

  const now = new Date();

  if (period === "today") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }

  if (period === "7d") {
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }

  now.setDate(now.getDate() - 30);
  return now.toISOString();
}

function round(value: number, decimals = 1): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeTerminalNumber(value: unknown): 1 | 2 | null {
  const number = Number(value);

  if (number === 1 || number === 2) {
    return number;
  }

  return null;
}

function normalizeUserName(user: UserRecord | undefined): string {
  if (!user) {
    return "System";
  }

  return user.display_name?.trim() || user.email?.trim() || "Unknown User";
}

function normalizeJeepneyName(jeepney: JeepneyRecord | undefined): string {
  if (!jeepney) {
    return "Unknown Jeepney";
  }

  return jeepney.jeep_name?.trim() || "Unnamed Jeepney";
}

function calculateTripDuration(trip: TripRecord): number | null {
  if (trip.trip_duration !== null && trip.trip_duration !== undefined) {
    return Number(trip.trip_duration);
  }

  if (!trip.departure_time || !trip.arrival_time) {
    return null;
  }

  const departure = new Date(trip.departure_time).getTime();
  const arrival = new Date(trip.arrival_time).getTime();

  if (!Number.isFinite(departure) || !Number.isFinite(arrival)) {
    return null;
  }

  const seconds = Math.max(0, Math.floor((arrival - departure) / 1000));

  return seconds;
}

function getTripDisplayName(jeepney: JeepneyRecord | undefined): string {
  return normalizeJeepneyName(jeepney);
}

export function useAdminMonitoring(): MonitoringResult {
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);

  const [trips, setTrips] = useState<TripMonitoringRecord[]>([]);

  const [stats, setStats] = useState<MonitoringStats>(EMPTY_STATS);

  const [terminalStats, setTerminalStats] = useState<TerminalMonitoringStats[]>(
    [],
  );

  const [staffStats, setStaffStats] = useState<StaffMonitoringStats>({
    total: 0,
    active: 0,
    inactive: 0,
    drivers: 0,
    dispatchers: 0,
    admins: 0,
  });

  const [jeepneyStats, setJeepneyStats] = useState<JeepneyMonitoringStats[]>(
    [],
  );

  const [dailyTrips, setDailyTrips] = useState<DailyTripStats[]>([]);

  const [dailyActivity, setDailyActivity] = useState<DailyActivityStats[]>([]);

  const [actionStats, setActionStats] = useState<ActionStats[]>([]);

  const [period, setPeriod] = useState<MonitoringPeriod>("7d");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadMonitoring = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const periodStart = getPeriodStart(period);

        let tripQuery = supabase
          .from("trips")
          .select(
            `
            id,
            jeepney_id,
            driver_id,
            dispatcher_id,
            departure_time,
            arrival_time,
            occupancy_at_departure,
            route,
            total_passengers,
            trip_duration,
            created_at,
            updated_at,
            status,
            loading_duration_seconds
          `,
          )
          .order("departure_time", {
            ascending: false,
          });

        let activityQuery = supabase
          .from("activity_logs")
          .select(
            `
            id,
            user_id,
            action,
            entity_type,
            entity_id,
            description,
            metadata,
            terminal_id,
            jeepney_id,
            created_at
          `,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(300);

        if (periodStart) {
          tripQuery = tripQuery.gte("created_at", periodStart);
          activityQuery = activityQuery.gte("created_at", periodStart);
        }

        const [
          tripResult,
          activityResult,
          usersResult,
          jeepneysResult,
          terminalsResult,
        ] = await Promise.all([
          tripQuery,
          activityQuery,

          supabase.from("users").select(`
              id,
              display_name,
              email,
              role,
              is_active
            `),

          supabase.from("jeepneys").select(`
              id,
              jeep_name,
              plate_number,
              terminal_id,
              status
            `),

          supabase
            .from("terminals")
            .select(
              `
              id,
              terminal_number,
              name,
              is_active
            `,
            )
            .in("terminal_number", [1, 2])
            .order("terminal_number", {
              ascending: true,
            }),
        ]);

        if (tripResult.error) {
          throw tripResult.error;
        }

        if (activityResult.error) {
          throw activityResult.error;
        }

        if (usersResult.error) {
          throw usersResult.error;
        }

        if (jeepneysResult.error) {
          throw jeepneysResult.error;
        }

        if (terminalsResult.error) {
          throw terminalsResult.error;
        }

        const rawTrips = (tripResult.data ?? []) as TripRecord[];

        const rawActivities = (activityResult.data ?? []) as ActivityLogRaw[];

        const users = (usersResult.data ?? []) as UserRecord[];

        const jeepneys = (jeepneysResult.data ?? []) as JeepneyRecord[];

        const terminals = (terminalsResult.data ?? []) as TerminalRecord[];

        const usersById = new Map<string, UserRecord>();

        users.forEach((user) => {
          usersById.set(user.id, user);
        });

        const jeepneysById = new Map<string, JeepneyRecord>();

        jeepneys.forEach((jeepney) => {
          jeepneysById.set(jeepney.id, jeepney);
        });

        const normalizedTrips: TripMonitoringRecord[] = rawTrips.map((trip) => {
          const jeepney = trip.jeepney_id
            ? jeepneysById.get(trip.jeepney_id)
            : undefined;

          const driver = trip.driver_id
            ? usersById.get(trip.driver_id)
            : undefined;

          const dispatcher = trip.dispatcher_id
            ? usersById.get(trip.dispatcher_id)
            : undefined;

          return {
            id: trip.id,
            jeepney_id: trip.jeepney_id,
            driver_id: trip.driver_id,
            dispatcher_id: trip.dispatcher_id,
            departure_time: trip.departure_time,
            arrival_time: trip.arrival_time,
            occupancy_at_departure: Number(trip.occupancy_at_departure ?? 0),
            route: trip.route || "Donsol-Daraga",
            total_passengers: Number(trip.total_passengers ?? 0),
            trip_duration: calculateTripDuration(trip),
            created_at: trip.created_at || "",
            updated_at: trip.updated_at || "",
            status: trip.status || "unknown",
            loading_duration_seconds:
              trip.loading_duration_seconds !== null
                ? Number(trip.loading_duration_seconds)
                : null,

            jeepney_name: getTripDisplayName(jeepney),

            plate_number: jeepney?.plate_number || "No plate",

            driver_name: normalizeUserName(driver),

            dispatcher_name: normalizeUserName(dispatcher),
          };
        });

        const normalizedActivities: ActivityLogRecord[] = rawActivities.map(
          (log) => {
            const user = log.user_id ? usersById.get(log.user_id) : undefined;

            const jeepney = log.jeepney_id
              ? jeepneysById.get(log.jeepney_id)
              : undefined;

            return {
              id: log.id,
              user_id: log.user_id,
              action: log.action,
              entity_type: log.entity_type,
              entity_id: log.entity_id,
              description: log.description,
              metadata: log.metadata,
              terminal_id: normalizeTerminalNumber(log.terminal_id),
              jeepney_id: log.jeepney_id,
              created_at: log.created_at,

              user_name: normalizeUserName(user),

              jeepney_name: normalizeJeepneyName(jeepney),

              jeepney_plate: jeepney?.plate_number || "",
            };
          },
        );

        const completedTrips = normalizedTrips.filter(
          (trip) => trip.status === "completed" || trip.status === "arrived",
        );

        const activeTrips = normalizedTrips.filter(
          (trip) =>
            trip.status === "active" ||
            trip.status === "en_route" ||
            trip.status === "loading" ||
            trip.status === "dispatched",
        );

        const passengerValues = normalizedTrips.map(
          (trip) => trip.total_passengers,
        );

        const tripDurations = normalizedTrips
          .map((trip) => trip.trip_duration)
          .filter((value): value is number => value !== null && value >= 0);

        const loadingDurations = normalizedTrips
          .map((trip) => trip.loading_duration_seconds)
          .filter((value): value is number => value !== null && value >= 0);

        const activeJeepneys = jeepneys.filter(
          (jeepney) => jeepney.status !== "inactive",
        );

        const activeStaff = users.filter((user) => user.is_active === true);

        const drivers = users.filter((user) => user.role === "driver");

        const dispatchers = users.filter((user) => user.role === "dispatcher");

        const admins = users.filter((user) => user.role === "admin");

        const calculatedStats: MonitoringStats = {
          totalTrips: normalizedTrips.length,

          completedTrips: completedTrips.length,

          activeTrips: activeTrips.length,

          totalPassengers: passengerValues.reduce(
            (sum, value) => sum + value,
            0,
          ),

          averagePassengers: round(average(passengerValues)),

          averageTripDuration: round(average(tripDurations)),

          averageLoadingDuration: round(average(loadingDurations)),

          activeJeepneys: activeJeepneys.length,

          totalJeepneys: jeepneys.length,

          activeStaff: activeStaff.length,

          totalStaff: users.length,

          drivers: drivers.length,

          dispatchers: dispatchers.length,

          admins: admins.length,

          totalActivityLogs: normalizedActivities.length,
        };

        const calculatedStaffStats: StaffMonitoringStats = {
          total: users.length,

          active: activeStaff.length,

          inactive: Math.max(0, users.length - activeStaff.length),

          drivers: drivers.length,

          dispatchers: dispatchers.length,

          admins: admins.length,
        };

        const calculatedTerminalStats: TerminalMonitoringStats[] =
          terminals.map((terminal) => {
            const terminalNumber = normalizeTerminalNumber(
              terminal.terminal_number,
            ) as 1 | 2;

            const terminalJeepneys = jeepneys.filter(
              (jeepney) =>
                normalizeTerminalNumber(jeepney.terminal_id) === terminalNumber,
            );

            const terminalTrips = normalizedTrips.filter((trip) => {
              const jeepney = trip.jeepney_id
                ? jeepneysById.get(trip.jeepney_id)
                : undefined;

              return (
                normalizeTerminalNumber(jeepney?.terminal_id) === terminalNumber
              );
            });

            const terminalActivities = normalizedActivities.filter(
              (activity) => activity.terminal_id === terminalNumber,
            );

            const terminalPassengers = terminalTrips.map(
              (trip) => trip.total_passengers,
            );

            const terminalDurations = terminalTrips
              .map((trip) => trip.trip_duration)
              .filter((value): value is number => value !== null && value >= 0);

            return {
              terminalNumber,

              terminalName:
                terminal.name || (terminalNumber === 1 ? "Donsol" : "Daraga"),

              totalTrips: terminalTrips.length,

              completedTrips: terminalTrips.filter(
                (trip) =>
                  trip.status === "completed" || trip.status === "arrived",
              ).length,

              activeTrips: terminalTrips.filter(
                (trip) =>
                  trip.status === "active" ||
                  trip.status === "en_route" ||
                  trip.status === "loading" ||
                  trip.status === "dispatched",
              ).length,

              totalPassengers: terminalPassengers.reduce(
                (sum, value) => sum + value,
                0,
              ),

              averagePassengers: round(average(terminalPassengers)),

              averageTripDuration: round(average(terminalDurations)),

              activityCount: terminalActivities.length,

              activeJeepneys: terminalJeepneys.filter(
                (jeepney) => jeepney.status !== "inactive",
              ).length,
            };
          });

        const jeepneyStatsMap = new Map<string, JeepneyMonitoringStats>();

        jeepneys.forEach((jeepney) => {
          jeepneyStatsMap.set(jeepney.id, {
            id: jeepney.id,

            name: normalizeJeepneyName(jeepney),

            plateNumber: jeepney.plate_number,

            terminalId: normalizeTerminalNumber(jeepney.terminal_id),

            status: jeepney.status || "inactive",

            totalTrips: 0,

            totalPassengers: 0,

            averagePassengers: 0,

            averageTripDuration: 0,
          });
        });

        normalizedTrips.forEach((trip) => {
          if (!trip.jeepney_id) {
            return;
          }

          const item = jeepneyStatsMap.get(trip.jeepney_id);

          if (!item) {
            return;
          }

          item.totalTrips += 1;

          item.totalPassengers += trip.total_passengers;
        });

        const jeepneyDurationMap = new Map<string, number[]>();

        normalizedTrips.forEach((trip) => {
          if (!trip.jeepney_id || trip.trip_duration === null) {
            return;
          }

          const values = jeepneyDurationMap.get(trip.jeepney_id) || [];

          values.push(trip.trip_duration);

          jeepneyDurationMap.set(trip.jeepney_id, values);
        });

        jeepneyStatsMap.forEach((item) => {
          const jeepneyTrips = normalizedTrips.filter(
            (trip) => trip.jeepney_id === item.id,
          );

          item.averagePassengers = round(
            average(jeepneyTrips.map((trip) => trip.total_passengers)),
          );

          item.averageTripDuration = round(
            average(jeepneyDurationMap.get(item.id) || []),
          );
        });

        const calculatedJeepneyStats = Array.from(
          jeepneyStatsMap.values(),
        ).sort((a, b) => {
          if (b.totalTrips !== a.totalTrips) {
            return b.totalTrips - a.totalTrips;
          }

          return a.name.localeCompare(b.name);
        });

        const dailyTripMap = new Map<string, DailyTripStats>();

        normalizedTrips.forEach((trip) => {
          const timestamp = trip.departure_time || trip.created_at;

          if (!timestamp) {
            return;
          }

          const date = formatDateKey(timestamp);

          const existing = dailyTripMap.get(date) || {
            date,
            trips: 0,
            passengers: 0,
            completedTrips: 0,
          };

          existing.trips += 1;

          existing.passengers += trip.total_passengers;

          if (trip.status === "completed" || trip.status === "arrived") {
            existing.completedTrips += 1;
          }

          dailyTripMap.set(date, existing);
        });

        const calculatedDailyTrips = Array.from(dailyTripMap.values()).sort(
          (a, b) => a.date.localeCompare(b.date),
        );

        const dailyActivityMap = new Map<string, DailyActivityStats>();

        normalizedActivities.forEach((activity) => {
          const date = formatDateKey(activity.created_at);

          const existing = dailyActivityMap.get(date) || {
            date,
            count: 0,
          };

          existing.count += 1;

          dailyActivityMap.set(date, existing);
        });

        const calculatedDailyActivity = Array.from(
          dailyActivityMap.values(),
        ).sort((a, b) => a.date.localeCompare(b.date));

        const actionMap = new Map<string, number>();

        normalizedActivities.forEach((activity) => {
          const action = activity.action?.trim() || "unknown";

          actionMap.set(action, (actionMap.get(action) || 0) + 1);
        });

        const calculatedActionStats = Array.from(actionMap.entries())
          .map(([action, count]) => ({
            action,
            count,
          }))
          .sort((a, b) => b.count - a.count);

        if (!mountedRef.current) {
          return;
        }

        setActivityLogs(normalizedActivities);

        setTrips(normalizedTrips);

        setStats(calculatedStats);

        setTerminalStats(calculatedTerminalStats);

        setStaffStats(calculatedStaffStats);

        setJeepneyStats(calculatedJeepneyStats);

        setDailyTrips(calculatedDailyTrips);

        setDailyActivity(calculatedDailyActivity);

        setActionStats(calculatedActionStats);
      } catch (err: any) {
        console.error("Failed to load admin monitoring:", err);

        if (mountedRef.current) {
          setError(err?.message || "Unable to load monitoring data.");
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [period],
  );

  useEffect(() => {
    mountedRef.current = true;

    void loadMonitoring(false);

    return () => {
      mountedRef.current = false;
    };
  }, [loadMonitoring]);

  useEffect(() => {
    let active = true;

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);

      channelRef.current = null;
    }

    const channelName = `admin-monitoring-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const channel = supabase.channel(channelName);

    channelRef.current = channel;

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "activity_logs",
      },
      () => {
        if (active) {
          void loadMonitoring(true);
        }
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trips",
      },
      () => {
        if (active) {
          void loadMonitoring(true);
        }
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "jeepneys",
      },
      () => {
        if (active) {
          void loadMonitoring(true);
        }
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "users",
      },
      () => {
        if (active) {
          void loadMonitoring(true);
        }
      },
    );

    channel.subscribe((status) => {
      if (!active) {
        return;
      }

      if (status === "SUBSCRIBED") {
        console.log(`📡 Admin monitoring realtime: ${channelName} OPEN`);
      }

      if (status === "CHANNEL_ERROR") {
        console.warn(`📡 Admin monitoring realtime: ${channelName} ERROR`);
      }

      if (status === "TIMED_OUT") {
        console.warn(`📡 Admin monitoring realtime: ${channelName} TIMED OUT`);
      }
    });

    return () => {
      active = false;

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [loadMonitoring]);

  const refresh = useCallback(async () => {
    await loadMonitoring(true);
  }, [loadMonitoring]);

  return {
    activityLogs,
    trips,
    stats,
    terminalStats,
    staffStats,
    jeepneyStats,
    dailyTrips,
    dailyActivity,
    actionStats,

    loading,
    refreshing,
    error,

    period,
    setPeriod,

    refresh,
  };
}
