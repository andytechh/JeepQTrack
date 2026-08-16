import { supabase } from "../../config/supabase";

export interface AdminJeepney {
  id: string;
  plate_number: string;
  jeep_name: string | null;
  driver_name: string | null;
  driver_id: string | null;
  terminal_id: number | null;
  status:
    "waiting" | "loading" | "en_route" | "arrived" | "dispatched" | "inactive";
  current_occupancy: number | null;
  capacity: number | null;
  queue_position: number | null;
  departure_time: string | null;
  eta: number | null;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  updated_at: string | null;
}

export class AdminDashboardService {
  static async getJeepneys(): Promise<AdminJeepney[]> {
    const { data, error } = await supabase
      .from("jeepneys")
      .select(
        `
        id,
        plate_number,
        jeep_name,
        driver_name,
        driver_id,
        terminal_id,
        status,
        current_occupancy,
        capacity,
        queue_position,
        departure_time,
        eta,
        current_latitude,
        current_longitude,
        last_location_update,
        updated_at
      `,
      )
      .order("terminal_id", {
        ascending: true,
      })
      .order("queue_position", {
        ascending: true,
        nullsFirst: false,
      });

    if (error) {
      console.error("❌ Admin dashboard jeepneys error:", error);

      throw new Error(error.message);
    }

    return (data ?? []) as AdminJeepney[];
  }

  static async getActiveJeepneys(): Promise<AdminJeepney[]> {
    const { data, error } = await supabase
      .from("jeepneys")
      .select(
        `
        id,
        plate_number,
        jeep_name,
        driver_name,
        driver_id,
        terminal_id,
        status,
        current_occupancy,
        capacity,
        queue_position,
        departure_time,
        eta,
        current_latitude,
        current_longitude,
        last_location_update,
        updated_at
      `,
      )
      .neq("status", "inactive")
      .order("terminal_id", {
        ascending: true,
      })
      .order("queue_position", {
        ascending: true,
        nullsFirst: false,
      });

    if (error) {
      console.error("❌ Admin active jeepneys error:", error);

      throw new Error(error.message);
    }

    return (data ?? []) as AdminJeepney[];
  }
}
