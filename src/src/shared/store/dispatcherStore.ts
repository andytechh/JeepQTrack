// src/shared/store/dispatcherStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { supabase } from "../config/supabase";

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

export interface TripLog {
  id: string;
  jeepney_id: string;
  jeepney_plate: string;
  driver_name: string;
  route: string;
  status: "completed" | "in_progress" | "cancelled";
  passengers: number;
  started_at: string;
  ended_at: string | null;
}

interface DispatcherState {
  jeepneys: Jeepney[];
  tripLogs: TripLog[];
  stats: {
    totalJeepneys: number;
    onlineJeepneys: number;
    waitingDrivers: number;
    queueLength: number;
    activeTrips: number;
  };
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetched: string | null;
  fetchData: () => Promise<void>;
  refresh: () => Promise<void>;
  setRefreshing: (value: boolean) => void;
  clear: () => void;
}

export const useDispatcherStore = create<DispatcherState>()(
  persist(
    (set, get) => ({
      jeepneys: [],
      tripLogs: [],
      stats: {
        totalJeepneys: 0,
        onlineJeepneys: 0,
        waitingDrivers: 0,
        queueLength: 0,
        activeTrips: 0,
      },
      loading: false,
      refreshing: false,
      error: null,
      lastFetched: null,

      fetchData: async () => {
        const state = get();
        set({ loading: true, error: null });

        try {
          // 1. Fetch jeepneys
          const { data: jeepneys, error: jeepneyError } = await supabase
            .from("jeepneys")
            .select("*")
            .order("bracket", { ascending: true })
            .order("queue_position", { ascending: true, nullsLast: true });

          if (jeepneyError) throw jeepneyError;

          // 2. Compute stats
          const total = jeepneys?.length || 0;
          const online =
            jeepneys?.filter((j: any) =>
              ["active", "en_route", "loading"].includes(j.status),
            ).length || 0;
          const waiting =
            jeepneys?.filter((j: any) => j.status === "waiting").length || 0;
          const queueLength =
            jeepneys?.filter((j: any) => j.queue_position !== null).length || 0;
          const activeTrips =
            jeepneys?.filter((j: any) =>
              ["en_route", "arrived"].includes(j.status),
            ).length || 0;

          const stats = {
            totalJeepneys: total,
            onlineJeepneys: online,
            waitingDrivers: waiting,
            queueLength,
            activeTrips,
          };

          // 3. Fetch trip logs (or fallback)
          let tripLogs: TripLog[] = [];
          try {
            const { data: trips, error: tripsError } = await supabase
              .from("trips")
              .select(
                `
                id,
                jeepney_id,
                route,
                status,
                passengers,
                started_at,
                ended_at,
                jeepneys:jeepney_id (plate_number, driver_name)
              `,
              )
              .order("started_at", { ascending: false })
              .limit(10);

            if (!tripsError && trips) {
              tripLogs = trips.map((t: any) => ({
                id: t.id,
                jeepney_id: t.jeepney_id,
                jeepney_plate: t.jeepneys?.plate_number || "Unknown",
                driver_name: t.jeepneys?.driver_name || "Unknown",
                route: t.route || "Daraga → Donsol",
                status: t.status,
                passengers: t.passengers || 0,
                started_at: t.started_at,
                ended_at: t.ended_at,
              }));
            } else {
              // Fallback: generate from jeepneys
              tripLogs =
                jeepneys
                  ?.filter((j: any) =>
                    ["en_route", "arrived"].includes(j.status),
                  )
                  .slice(0, 5)
                  .map((j: any) => ({
                    id: j.id,
                    jeepney_id: j.id,
                    jeepney_plate: j.plate_number,
                    driver_name: j.driver_name || "Unknown",
                    route: "Daraga → Donsol",
                    status:
                      j.status === "en_route" ? "in_progress" : "completed",
                    passengers: j.current_occupancy,
                    started_at: new Date().toISOString(),
                    ended_at:
                      j.status === "arrived" ? new Date().toISOString() : null,
                  })) || [];
            }
          } catch (e) {
            console.warn("Trips fallback used:", e);
          }

          set({
            jeepneys: jeepneys || [],
            tripLogs,
            stats,
            loading: false,
            error: null,
            lastFetched: new Date().toISOString(),
          });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      refresh: async () => {
        set({ refreshing: true });
        await get().fetchData();
        set({ refreshing: false });
      },

      setRefreshing: (value: boolean) => set({ refreshing: value }),

      clear: () => {
        set({
          jeepneys: [],
          tripLogs: [],
          stats: {
            totalJeepneys: 0,
            onlineJeepneys: 0,
            waitingDrivers: 0,
            queueLength: 0,
            activeTrips: 0,
          },
          loading: false,
          error: null,
          lastFetched: null,
        });
      },
    }),
    {
      name: "dispatcher-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        jeepneys: state.jeepneys,
        tripLogs: state.tripLogs,
        stats: state.stats,
        lastFetched: state.lastFetched,
      }),
    },
  ),
);
