import { supabase } from "@/src/shared/config/supabase";

export type JeepneyStatus =
  "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";

export interface AdminJeepney {
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
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  created_at: string | null;
  updated_at: string | null;
  latitude: number | null;
  longitude: number | null;
  last_queue_update: string | null;
  entered_geofence_at: string | null;
  loading_started_at: string | null;
  departed_at: string | null;
  jeep_name: string | null;
  driver_name: string | null;
  driver_id: string | null;
  terminal_id: number | null;
  loading_ends_at: string | null;
}

const JEEPNEY_COLUMNS = `
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
  current_latitude,
  current_longitude,
  last_location_update,
  created_at,
  updated_at,
  latitude,
  longitude,
  last_queue_update,
  entered_geofence_at,
  loading_started_at,
  departed_at,
  jeep_name,
  driver_name,
  driver_id,
  terminal_id,
  loading_ends_at
`;

export class AdminJeepneyService {
  static async getJeepneys(): Promise<AdminJeepney[]> {
    const { data, error } = await supabase
      .from("jeepneys")
      .select(JEEPNEY_COLUMNS)
      .order("terminal_id", { ascending: true })
      .order("queue_position", {
        ascending: true,
        nullsFirst: false,
      })
      .order("plate_number", { ascending: true });

    if (error) {
      console.error("❌ Failed to fetch admin jeepneys:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as AdminJeepney[];
  }

  static async getJeepney(jeepneyId: string): Promise<AdminJeepney | null> {
    const { data, error } = await supabase
      .from("jeepneys")
      .select(JEEPNEY_COLUMNS)
      .eq("id", jeepneyId)
      .maybeSingle();

    if (error) {
      console.error("❌ Failed to fetch jeepney:", error);
      throw new Error(error.message);
    }

    return data as AdminJeepney | null;
  }

  static subscribeToJeepneys(onChange: () => void) {
    const channel = supabase
      .channel("admin-jeepneys-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
        },
        () => {
          onChange();
        },
      )
      .subscribe((status) => {
        console.log("📡 Admin jeepneys realtime:", status);
      });

    return channel;
  }

  static async updateJeepney(
    jeepneyId: string,
    updates: Partial<AdminJeepney>,
  ) {
    const allowedUpdates = {
      plate_number: updates.plate_number,
      bracket: updates.bracket,
      capacity: updates.capacity,
      jeep_name: updates.jeep_name,
      driver_name: updates.driver_name,
      driver_id: updates.driver_id,
      terminal_id: updates.terminal_id,
    };

    const cleanedUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([, value]) => value !== undefined),
    );

    const { data, error } = await supabase
      .from("jeepneys")
      .update(cleanedUpdates)
      .eq("id", jeepneyId)
      .select(JEEPNEY_COLUMNS)
      .single();

    if (error) {
      console.error("❌ Failed to update jeepney:", error);
      throw new Error(error.message);
    }

    return data as AdminJeepney;
  }
}
