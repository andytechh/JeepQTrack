// src/shared/store/dispatcherStore.ts
import { create } from "zustand";
import { supabase } from "../config/supabase";
import { useAuthStore } from "./authStore";

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

interface DispatcherState {
  jeepneys: Jeepney[];
  stats: {
    totalJeepneys: number;
    onlineJeepneys: number;
    waitingDrivers: number;
    queueLength: number;
    activeTrips: number;
  };
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  fetchData: () => Promise<void>;
  refresh: () => Promise<void>;
  setupSubscriptions: () => void;
  cleanupSubscriptions: () => void;
}

export const useDispatcherStore = create<DispatcherState>((set, get) => {
  let jeepneyChannel: any = null;

  const computeStats = (jeepneys: Jeepney[]) => {
    const total = jeepneys.length;
    const online = jeepneys.filter((j) =>
      ["active", "en_route", "loading"].includes(j.status),
    ).length;
    const waiting = jeepneys.filter((j) => j.status === "waiting").length;
    const queueLength = jeepneys.filter(
      (j) => j.queue_position !== null,
    ).length;
    const activeTrips = jeepneys.filter((j) =>
      ["en_route", "arrived"].includes(j.status),
    ).length;
    return {
      totalJeepneys: total,
      onlineJeepneys: online,
      waitingDrivers: waiting,
      queueLength,
      activeTrips,
    };
  };

  return {
    jeepneys: [],
    stats: {
      totalJeepneys: 0,
      onlineJeepneys: 0,
      waitingDrivers: 0,
      queueLength: 0,
      activeTrips: 0,
    },
    loading: false,
    error: null,
    refreshing: false,

    fetchData: async () => {
      const { user } = useAuthStore.getState();
      if (!user?.uid) {
        set({ error: "User not authenticated", loading: false });
        return;
      }

      set({ loading: true, error: null });

      try {
        const { data: jeepneys, error } = await supabase
          .from("jeepneys")
          .select("*")
          .order("bracket", { ascending: true })
          .order("queue_position", { ascending: true, nullsLast: true });

        if (error) throw error;

        const list = (jeepneys as Jeepney[]) || [];
        const stats = computeStats(list);
        set({ jeepneys: list, stats, loading: false, error: null });
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },

    refresh: async () => {
      set({ refreshing: true });
      await get().fetchData();
      set({ refreshing: false });
    },

    setupSubscriptions: () => {
      const { user } = useAuthStore.getState();
      if (!user?.uid) return;

      get().cleanupSubscriptions();

      jeepneyChannel = supabase
        .channel("dispatcher-jeepneys")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "jeepneys" },
          () => {
            console.log("🔄 Jeepney change detected, refetching...");
            get().fetchData();
          },
        )
        .subscribe((status) => {
          console.log("📡 Dispatcher subscription status:", status);
        });
    },

    cleanupSubscriptions: () => {
      if (jeepneyChannel) {
        jeepneyChannel.unsubscribe();
        jeepneyChannel = null;
      }
    },
  };
});
