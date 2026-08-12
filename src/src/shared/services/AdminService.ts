// src/shared/services/AdminService.ts
// Centralized data layer for everything the Admin side of the app needs.
// Keeps screens thin — screens call these functions instead of talking to
// supabase directly, so query logic lives in one place and is easy to test.

import { supabase } from "../config/supabase";

// ─── Types ──────────────────────────────────────────────────────────
export type UserRole = "driver" | "dispatcher" | "admin";

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  phone_number: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Jeepney {
  id: string;
  plate_number: string;
  bracket: number;
  capacity: number;
  current_occupancy?: number;
  status: "waiting" | "queued" | "dispatched" | "in_transit" | "maintenance" | "inactive";
  created_at?: string;
}

export interface Trip {
  id: string;
  jeepney_id: string;
  driver_id?: string;
  departure_time: string;
  arrival_time?: string | null;
  total_passengers: number;
  status?: string;
}

export interface DashboardStats {
  jeepneys: number;
  activeDrivers: number;
  tripsToday: number;
  totalUsers: number;
  activeTrips: number;
  totalPassengersToday: number;
}

export interface AppSettings {
  base_fare: number;
  fare_per_km: number;
  max_queue_size: number;
  maintenance_mode: boolean;
}

// ─── Dashboard ──────────────────────────────────────────────────────
export const AdminService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const todayStart = new Date().toISOString().split("T")[0];

    const [
      { count: jeepneys },
      { count: activeDrivers },
      { count: totalUsers },
      { count: tripsToday },
      { count: activeTrips },
      { data: passengerRows },
    ] = await Promise.all([
      supabase.from("jeepneys").select("id", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "driver")
        .eq("is_active", true),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .gte("departure_time", todayStart),
      supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("status", "in_transit"),
      supabase
        .from("trips")
        .select("total_passengers")
        .gte("departure_time", todayStart),
    ]);

    const totalPassengersToday = (passengerRows || []).reduce(
      (sum: number, r: any) => sum + (r.total_passengers || 0),
      0,
    );

    return {
      jeepneys: jeepneys || 0,
      activeDrivers: activeDrivers || 0,
      totalUsers: totalUsers || 0,
      tripsToday: tripsToday || 0,
      activeTrips: activeTrips || 0,
      totalPassengersToday,
    };
  },

  // ─── Users ──────────────────────────────────────────────────────
  async getUsers(opts?: { search?: string; role?: UserRole | "all" }) {
    let query = supabase
      .from("users")
      .select("id, email, display_name, role, phone_number, is_active, created_at")
      .order("created_at", { ascending: false });

    if (opts?.role && opts.role !== "all") {
      query = query.eq("role", opts.role);
    }
    if (opts?.search) {
      query = query.or(
        `display_name.ilike.%${opts.search}%,email.ilike.%${opts.search}%`,
      );
    }

    const { data, error } = await query.limit(500);
    if (error) throw error;
    return (data || []) as AdminUser[];
  },

  async getUser(id: string) {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, display_name, role, phone_number, is_active, created_at")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as AdminUser;
  },

  /**
   * Creates a staff account. Creating a Supabase Auth user on behalf of
   * someone else requires the service role key, which must never live in
   * the client app. This calls a Supabase Edge Function ("admin-create-user")
   * that you deploy separately with the service role key server-side.
   * The function should create the auth user and insert the matching row
   * in `users`, then return the new user's id.
   */
  async createUser(payload: {
    email: string;
    password: string;
    display_name: string;
    role: UserRole;
    phone_number?: string;
  }) {
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: payload,
    });
    if (error) throw error;
    return data;
  },

  async updateUser(
    id: string,
    payload: Partial<Pick<AdminUser, "display_name" | "role" | "phone_number" | "is_active">>,
  ) {
    const { error } = await supabase.from("users").update(payload).eq("id", id);
    if (error) throw error;
  },

  async toggleUserActive(id: string, isActive: boolean) {
    const { error } = await supabase
      .from("users")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteUser(id: string) {
    // Prefer deactivating over hard-deleting so trip history stays intact.
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) throw error;
  },

  // ─── Jeepneys ───────────────────────────────────────────────────
  async getJeepneys(opts?: { search?: string; status?: string | "all" }) {
    let query = supabase
      .from("jeepneys")
      .select("id, plate_number, bracket, status, current_occupancy, capacity, created_at")
      .order("created_at", { ascending: false });

    if (opts?.status && opts.status !== "all") {
      query = query.eq("status", opts.status);
    }
    if (opts?.search) {
      query = query.ilike("plate_number", `%${opts.search}%`);
    }

    const { data, error } = await query.limit(500);
    if (error) throw error;
    return (data || []) as Jeepney[];
  },

  async getJeepney(id: string) {
    const { data, error } = await supabase
      .from("jeepneys")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Jeepney;
  },

  async createJeepney(payload: {
    plate_number: string;
    bracket: number;
    capacity: number;
    status?: Jeepney["status"];
  }) {
    const { data, error } = await supabase
      .from("jeepneys")
      .insert({ status: "inactive", current_occupancy: 0, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data as Jeepney;
  },

  async updateJeepney(
    id: string,
    payload: Partial<Pick<Jeepney, "plate_number" | "bracket" | "capacity" | "status">>,
  ) {
    const { error } = await supabase.from("jeepneys").update(payload).eq("id", id);
    if (error) throw error;
  },

  async deleteJeepney(id: string) {
    const { error } = await supabase.from("jeepneys").delete().eq("id", id);
    if (error) throw error;
  },

  // ─── Trips ──────────────────────────────────────────────────────
  async getTrips(opts?: { search?: string; from?: string; to?: string }) {
    let query = supabase
      .from("trips")
      .select("id, jeepney_id, driver_id, departure_time, arrival_time, total_passengers, status")
      .order("departure_time", { ascending: false });

    if (opts?.from) query = query.gte("departure_time", opts.from);
    if (opts?.to) query = query.lte("departure_time", opts.to);

    const { data, error } = await query.limit(300);
    if (error) throw error;
    return (data || []) as Trip[];
  },

  async getTrip(id: string) {
    const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
    if (error) throw error;
    return data as Trip;
  },

  // ─── Reports ────────────────────────────────────────────────────
  async getTripsByDate(from?: string, to?: string) {
    const { data, error } = await supabase.rpc("trips_by_date", {
      from_date: from ?? null,
      to_date: to ?? null,
    });
    if (error) throw error;
    return (data || []) as { date: string; total_trips: number; total_passengers: number }[];
  },

  // ─── App settings ───────────────────────────────────────────────
  async getSettings(): Promise<AppSettings> {
    const { data, error } = await supabase
      .from("app_settings")
      .select("base_fare, fare_per_km, max_queue_size, maintenance_mode")
      .eq("id", 1)
      .single();
    if (error) throw error;
    return data as AppSettings;
  },

  async updateSettings(payload: Partial<AppSettings>) {
    const { error } = await supabase.from("app_settings").update(payload).eq("id", 1);
    if (error) throw error;
  },
};
