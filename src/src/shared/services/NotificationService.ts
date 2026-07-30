// src/shared/services/NotificationService.ts
import { supabase } from "../config/supabase";

// ─── TYPES ──────────────────────────────────────────────────────────
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
  data?: any;
  created_at: string;
  updated_at: string;
}

// ─── NOTIFICATION SERVICE ──────────────────────────────────────────
export class NotificationService {
  // ─── GET NOTIFICATIONS ─────────────────────────────────────────────
  static async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching notifications:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("❌ Error in getNotifications:", error);
      return [];
    }
  }

  // ─── MARK AS READ ──────────────────────────────────────────────────
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) {
        console.error("❌ Error marking as read:", error);
        throw error;
      }
    } catch (error) {
      console.error("❌ Error in markAsRead:", error);
      throw error;
    }
  }

  // ─── MARK ALL AS READ ─────────────────────────────────────────────
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) {
        console.error("❌ Error marking all as read:", error);
        throw error;
      }
    } catch (error) {
      console.error("❌ Error in markAllAsRead:", error);
      throw error;
    }
  }

  // ─── DELETE NOTIFICATION ──────────────────────────────────────────
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) {
        console.error("❌ Error deleting notification:", error);
        throw error;
      }
    } catch (error) {
      console.error("❌ Error in deleteNotification:", error);
      throw error;
    }
  }

  // ─── SUBSCRIBE TO NOTIFICATIONS ────────────────────────────────────
  static subscribeToNotifications(
    userId: string,
    onNewNotification: (notification: Notification) => void,
  ) {
    try {
      const subscription = supabase
        .channel(`notifications_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log("📱 New notification received:", payload.new);
            onNewNotification(payload.new as Notification);
          },
        )
        .subscribe((status) => {
          console.log(`📡 Notification subscription status: ${status}`);
        });

      return subscription;
    } catch (error) {
      console.error("❌ Error in subscribeToNotifications:", error);
      return null;
    }
  }

  // ─── GET UNREAD COUNT ─────────────────────────────────────────────
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) {
        console.error("❌ Error getting unread count:", error);
        return 0;
      }
      return count || 0;
    } catch (error) {
      console.error("❌ Error in getUnreadCount:", error);
      return 0;
    }
  }

  // ─── GET LATEST NOTIFICATIONS ──────────────────────────────────────
  static async getLatestNotifications(
    userId: string,
    limit: number = 5,
  ): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("❌ Error fetching latest notifications:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("❌ Error in getLatestNotifications:", error);
      return [];
    }
  }

  // ─── INSERT NOTIFICATION ──────────────────────────────────────────
  static async insertNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification["type"],
    data?: any,
  ): Promise<Notification | null> {
    try {
      const newNotification = {
        user_id: userId,
        title,
        message,
        type,
        read: false,
        data: data || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from("notifications")
        .insert(newNotification)
        .select()
        .single();

      if (error) {
        console.error("❌ Error inserting notification:", error);
        return null;
      }

      return inserted;
    } catch (error) {
      console.error("❌ Error in insertNotification:", error);
      return null;
    }
  }
}

// ─── EXPORT TYPES ──────────────────────────────────────────────────
export type NotificationType = Notification["type"];
