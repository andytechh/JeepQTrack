import { supabase } from "../config/supabase";

export type StaffRole = "driver" | "dispatcher" | "admin";

export type StaffNotificationType =
  | "arrival"
  | "dispatch"
  | "occupancy"
  | "eta"
  | "status"
  | "queue"
  | "system"
  | "chat";

export interface StaffNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: StaffNotificationType;
  read: boolean;
  data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffNotificationInput {
  title: string;
  message: string;
  type: StaffNotificationType;
  data?: Record<string, any> | null;
}

export class StaffNotificationService {
  static async getNotifications(): Promise<{
    success: boolean;
    data: StaffNotification[];
    error?: string;
  }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          data: [],
          error: "No authenticated staff session.",
        };
      }

      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
            id,
            user_id,
            title,
            message,
            type,
            read,
            data,
            created_at,
            updated_at
          `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return {
          success: false,
          data: [],
          error: error.message,
        };
      }

      return {
        success: true,
        data: (data ?? []) as StaffNotification[],
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        error: error?.message || "Unable to load notifications.",
      };
    }
  }

  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return false;

      const { error } = await supabase
        .from("notifications")
        .update({
          read: true,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      return !error;
    } catch {
      return false;
    }
  }

  static async markAllAsRead(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return false;

      const { error } = await supabase
        .from("notifications")
        .update({
          read: true,
        })
        .eq("user_id", user.id)
        .eq("read", false);

      return !error;
    } catch {
      return false;
    }
  }

  static async createForUser(
    userId: string,
    notification: CreateStaffNotificationInput,
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        data: notification.data ?? null,
      });

      if (error) {
        console.error("Failed to create notification:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("createForUser exception:", error);
      return false;
    }
  }

  static async createForRoles(
    roles: StaffRole[],
    notification: CreateStaffNotificationInput,
  ): Promise<{
    success: boolean;
    recipientIds: string[];
    error?: string;
  }> {
    try {
      const { data: staff, error } = await supabase
        .from("users")
        .select("id")
        .in("role", roles)
        .eq("is_active", true);

      if (error) {
        return {
          success: false,
          recipientIds: [],
          error: error.message,
        };
      }

      if (!staff?.length) {
        return {
          success: true,
          recipientIds: [],
        };
      }

      const rows = staff.map((member) => ({
        user_id: member.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        data: notification.data ?? null,
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(rows);

      if (insertError) {
        return {
          success: false,
          recipientIds: [],
          error: insertError.message,
        };
      }

      return {
        success: true,
        recipientIds: staff.map((member) => member.id),
      };
    } catch (error: any) {
      return {
        success: false,
        recipientIds: [],
        error: error?.message || "Unable to create staff notifications.",
      };
    }
  }

  static async createForAllStaff(notification: CreateStaffNotificationInput) {
    return this.createForRoles(["admin", "dispatcher", "driver"], notification);
  }
}

export default StaffNotificationService;
