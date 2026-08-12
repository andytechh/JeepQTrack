// src/shared/store/driverStore.ts
import { create } from "zustand";
import { supabase } from "../config/supabase";
import { insertNotification } from "../services/NotificationService"; // ensure this export exists
import { useAuthStore } from "./authStore";

// ─── TYPES ──────────────────────────────────────────────────────────
export interface Jeepney {
  id: string;
  plate_number: string;
  bracket: number;
  capacity: number;
  status:
    "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";
  current_occupancy: number;
  queue_position: number;
  current_latitude?: number;
  current_longitude?: number;
  departure_time?: string;
  eta?: number;
}

export interface DoorCounts {
  front_count: number;
  rear_count: number;
  updated_at: string;
}

export interface QueueInfo {
  position: number;
  status: string;
  entered_at: string;
}

export interface TripStats {
  todayTrips: number;
  totalPassengers: number;
  totalFare: number;
}

export interface StatusHistoryItem {
  status: string;
  updated_at: string;
}

export interface TripHistoryItem {
  id: string;
  route: string;
  time: string;
  passengers: number;
  status: "completed" | "in_progress" | "cancelled" | "pending";
  created_at: string;
}

interface DriverState {
  // Data
  jeepney: Jeepney | null;
  doorCounts: DoorCounts;
  queueInfo: QueueInfo | null;
  tripStats: TripStats;
  statusHistory: StatusHistoryItem[];
  trips: TripHistoryItem[];
  // UI state
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  // Actions
  fetchDashboard: () => Promise<void>;
  refresh: () => Promise<void>;
  updateJeepneyStatus: (newStatus: string) => Promise<boolean>;
  completeTrip: () => Promise<boolean>;
  sendEmergencyAlert: () => Promise<boolean>;
  // Internal helpers
  setupSubscriptions: () => void;
  cleanupSubscriptions: () => void;
}

export const useDriverStore = create<DriverState>((set, get) => {
  // ─── CHANNEL REFERENCES ──────────────────────────────────────────
  let jeepneyChannel: any = null;
  let doorChannel: any = null;
  let queueChannel: any = null;
  let tripChannel: any = null;

  // ─── NOTIFICATION DEBOUNCE ──────────────────────────────────────
  let lastNotifiedStatus: string | null = null;
  let notifyTimeout: NodeJS.Timeout | null = null;

  // ─── INITIAL STATE ──────────────────────────────────────────────
  const initialState = {
    jeepney: null,
    doorCounts: { front_count: 0, rear_count: 0, updated_at: "" },
    queueInfo: null,
    tripStats: { todayTrips: 0, totalPassengers: 0, totalFare: 0 },
    statusHistory: [],
    trips: [],
    loading: false,
    error: null,
    refreshing: false,
  };

  return {
    ...initialState,

    // ─── FETCH DASHBOARD ────────────────────────────────────────────
    fetchDashboard: async () => {
      const { user } = useAuthStore.getState();
      if (!user?.uid || !user?.jeepneyId) {
        set({
          error: "User not authenticated or no jeepney assigned",
          loading: false,
        });
        return;
      }

      set({ loading: true, error: null });

      try {
        // 1. Fetch jeepney details
        const { data: jeepneyData, error: jeepneyError } = await supabase
          .from("jeepneys")
          .select("*")
          .eq("id", user.jeepneyId)
          .single();

        if (jeepneyError) throw jeepneyError;
        set({ jeepney: jeepneyData as Jeepney });

        // 2. Fetch door counts (latest)
        const { data: doorData, error: doorError } = await supabase
          .from("door_counts")
          .select("*")
          .eq("jeep_id", user.jeepneyId)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (!doorError && doorData?.length) {
          set({ doorCounts: doorData[0] });
        }

        // 3. Fetch queue position
        const { data: queueData, error: queueError } = await supabase
          .from("queue")
          .select("*")
          .eq("jeepney_id", user.jeepneyId)
          .eq("status", "waiting")
          .order("queue_position", { ascending: true })
          .limit(1);

        if (!queueError && queueData?.length) {
          set({ queueInfo: queueData[0] as QueueInfo });
        } else {
          set({ queueInfo: null });
        }

        // 4. Fetch today's trip stats
        const today = new Date().toISOString().split("T")[0];
        const { data: tripsData, error: tripsError } = await supabase
          .from("trips")
          .select("*")
          .eq("jeepney_id", user.jeepneyId)
          .gte("departure_time", today);

        if (!tripsError && tripsData) {
          const totalPassengers = tripsData.reduce(
            (sum, t) => sum + (t.total_passengers || 0),
            0,
          );
          set({
            tripStats: {
              todayTrips: tripsData.length,
              totalPassengers: totalPassengers,
              totalFare: tripsData.reduce(
                (sum, t) => sum + (t.total_passengers || 0) * 15,
                0,
              ),
            },
          });
        }

        // 5. Fetch trip history (last 10)
        const { data: tripHistory } = await supabase
          .from("trips_history")
          .select("*")
          .eq("jeepney_id", user.jeepneyId)
          .order("departure_time", { ascending: false })
          .limit(10);

        if (tripHistory) {
          const formattedTrips = tripHistory.map((t) => ({
            id: t.id,
            route: t.route || "Unknown route",
            time: new Date(t.departure_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            passengers: t.total_passengers || 0,
            status: t.status || "pending",
            created_at: t.departure_time,
          }));
          set({ trips: formattedTrips });
        }

        // 6. Fetch status history (last 5)
        const { data: historyData } = await supabase
          .from("jeepneys")
          .select("status, updated_at")
          .eq("id", user.jeepneyId)
          .order("updated_at", { ascending: false })
          .limit(5);

        if (historyData) {
          set({ statusHistory: historyData });
        }

        set({ error: null, loading: false });
      } catch (error: any) {
        console.error("Dashboard fetch error:", error);
        set({
          error: error.message || "Failed to load dashboard",
          loading: false,
        });
      }
    },

    // ─── REFRESH ──────────────────────────────────────────────────
    refresh: async () => {
      set({ refreshing: true });
      await get().fetchDashboard();
      set({ refreshing: false });
    },

    // ─── UPDATE JEEPNEY STATUS ─────────────────────────────────────
    updateJeepneyStatus: async (newStatus: string) => {
      const { user } = useAuthStore.getState();
      const { jeepney } = get();
      if (!jeepney || !user?.uid) return false;

      try {
        const { error } = await supabase
          .from("jeepneys")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jeepney.id);

        if (error) throw error;

        // If status is 'en_route', create a trip record
        if (newStatus === "en_route") {
          await supabase.from("trips").insert({
            jeepney_id: jeepney.id,
            driver_id: user.uid,
            departure_time: new Date().toISOString(),
            occupancy_at_departure: jeepney.current_occupancy || 0,
            route: "Donsol-Daraga",
          });
        }

        // Update local state
        set((state) => ({
          jeepney: state.jeepney
            ? { ...state.jeepney, status: newStatus }
            : null,
        }));

        return true;
      } catch (error) {
        console.error("Status update error:", error);
        return false;
      }
    },

    // ─── COMPLETE TRIP ─────────────────────────────────────────────
    completeTrip: async () => {
      const { user } = useAuthStore.getState();
      const { jeepney, doorCounts } = get();
      if (!jeepney || !user?.uid) return false;

      try {
        // Update jeepney status
        await supabase
          .from("jeepneys")
          .update({
            status: "dispatched",
            updated_at: new Date().toISOString(),
          })
          .eq("id", jeepney.id);

        // Update trip with arrival time and passenger count
        const totalPassengers = doorCounts.front_count + doorCounts.rear_count;
        await supabase
          .from("trips")
          .update({
            arrival_time: new Date().toISOString(),
            total_passengers: totalPassengers,
          })
          .eq("jeepney_id", jeepney.id)
          .is("arrival_time", null)
          .order("departure_time", { ascending: false })
          .limit(1);

        // Update local state
        set((state) => ({
          jeepney: state.jeepney
            ? { ...state.jeepney, status: "dispatched" }
            : null,
        }));

        return true;
      } catch (error) {
        console.error("Complete trip error:", error);
        return false;
      }
    },

    // ─── SEND EMERGENCY ALERT ─────────────────────────────────────
    sendEmergencyAlert: async () => {
      const { user } = useAuthStore.getState();
      const { jeepney } = get();
      if (!jeepney || !user?.uid) return false;

      try {
        // Get all staff members (admin and dispatcher)
        const { data: staff } = await supabase
          .from("users")
          .select("id")
          .in("role", ["admin", "dispatcher"]);

        if (staff) {
          for (const s of staff) {
            await insertNotification(
              s.id,
              "🚨 EMERGENCY ALERT",
              `Driver ${user.displayName} (${jeepney.plate_number}) needs assistance at ${jeepney.current_latitude}, ${jeepney.current_longitude}`,
              "system",
              {
                type: "emergency",
                driverId: user.uid,
                jeepneyId: jeepney.id,
                location: {
                  lat: jeepney.current_latitude,
                  lng: jeepney.current_longitude,
                },
              },
            );
          }
        }
        return true;
      } catch (error) {
        console.error("Emergency alert error:", error);
        return false;
      }
    },

    // ─── SETUP REAL-TIME SUBSCRIPTIONS ──────────────────────────
    setupSubscriptions: () => {
      const { user } = useAuthStore.getState();
      if (!user?.jeepneyId || !user?.uid) return;

      // Cleanup existing subscriptions to avoid duplicates
      get().cleanupSubscriptions();

      const jeepneyId = user.jeepneyId;
      const userId = user.uid;

      // 1. Jeepney updates (with debounced notifications)
      jeepneyChannel = supabase
        .channel(`jeepney_${jeepneyId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "jeepneys",
            filter: `id=eq.${jeepneyId}`,
          },
          async (payload) => {
            const updated = payload.new as Jeepney;
            set({ jeepney: updated });

            // Only notify if status actually changed
            if (payload.new.status !== payload.old.status) {
              const newStatus = payload.new.status;
              // Avoid duplicate notifications for the same status
              if (lastNotifiedStatus !== newStatus) {
                lastNotifiedStatus = newStatus;
                // Debounce: clear any pending notification
                if (notifyTimeout) clearTimeout(notifyTimeout);
                notifyTimeout = setTimeout(async () => {
                  await insertNotification(
                    userId,
                    "Status Updated",
                    `Jeepney ${updated.plate_number} is now ${newStatus}`,
                    "status",
                    { jeepneyId, status: newStatus },
                  );
                }, 300); // wait 300ms before sending
              }
            }
          },
        )
        .subscribe();

      // 2. Door count updates (INSERT only)
      doorChannel = supabase
        .channel(`door_counts_${jeepneyId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "door_counts",
            filter: `jeep_id=eq.${jeepneyId}`,
          },
          (payload) => {
            set({ doorCounts: payload.new as DoorCounts });
          },
        )
        .subscribe();

      // 3. Queue updates (any change)
      queueChannel = supabase
        .channel(`queue_${jeepneyId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "queue",
            filter: `jeepney_id=eq.${jeepneyId}`,
          },
          async () => {
            // Refresh queue info
            const { data } = await supabase
              .from("queue")
              .select("*")
              .eq("jeepney_id", jeepneyId)
              .eq("status", "waiting")
              .order("queue_position", { ascending: true })
              .limit(1);

            if (data?.length) {
              set({ queueInfo: data[0] as QueueInfo });
            } else {
              set({ queueInfo: null });
            }
          },
        )
        .subscribe();

      // 4. Trip updates (INSERT)
      tripChannel = supabase
        .channel(`trips_${jeepneyId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "trips",
            filter: `jeepney_id=eq.${jeepneyId}`,
          },
          () => {
            // Refresh dashboard data
            get().fetchDashboard();
          },
        )
        .subscribe();
    },

    // ─── CLEANUP SUBSCRIPTIONS ──────────────────────────────────
    cleanupSubscriptions: () => {
      // Clear any pending notification timeout
      if (notifyTimeout) {
        clearTimeout(notifyTimeout);
        notifyTimeout = null;
      }
      // Reset last notified status
      lastNotifiedStatus = null;

      if (jeepneyChannel) {
        jeepneyChannel.unsubscribe();
        jeepneyChannel = null;
      }
      if (doorChannel) {
        doorChannel.unsubscribe();
        doorChannel = null;
      }
      if (queueChannel) {
        queueChannel.unsubscribe();
        queueChannel = null;
      }
      if (tripChannel) {
        tripChannel.unsubscribe();
        tripChannel = null;
      }
    },
  };
});
