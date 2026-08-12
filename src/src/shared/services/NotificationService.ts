import { supabase } from "../config/supabase";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type:
    | "arrival"
    | "dispatch"
    | "occupancy"
    | "eta"
    | "status"
    | "queue"
    | "system"
    | "chat";
  read: boolean;
  data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export class NotificationService {
  static async getNotifications(): Promise<{
    success: boolean;
    data: Notification[];
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
          error: "No authenticated commuter session.",
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
        console.error("❌ Failed to fetch notifications:", error);

        return {
          success: false,
          data: [],
          error: error.message,
        };
      }

      return {
        success: true,
        data: (data ?? []) as Notification[],
      };
    } catch (error: any) {
      console.error("❌ getNotifications exception:", error);

      return {
        success: false,
        data: [],
        error: error?.message || "Unable to load notifications.",
      };
    }
  }

  static async getUnreadCount(): Promise<number> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        console.error("❌ Failed to get unread count:", error);
        return 0;
      }

      return count ?? 0;
    } catch (error) {
      console.error("❌ getUnreadCount exception:", error);
      return 0;
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

      if (error) {
        console.error("❌ Failed to mark notification as read:", error);

        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ markAsRead exception:", error);
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

      if (error) {
        console.error("❌ Failed to mark all notifications as read:", error);

        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ markAllAsRead exception:", error);
      return false;
    }
  }
}
