// // src/shared/services/NotificationService.ts
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { Platform } from "react-native";
// import { supabase } from "../config/supabase";

// export interface Notification {
//   id: string;
//   user_id: string;
//   title: string;
//   message: string;
//   type:
//     | "arrival"
//     | "dispatch"
//     | "occupancy"
//     | "eta"
//     | "status"
//     | "queue"
//     | "system"
//     | "chat";
//   read: boolean;
//   data?: any;
//   created_at: string;
//   updated_at: string;
// }

// export class NotificationService {
//   private static deviceTokenKey = "@device_token";

//   // Request permissions and get token
//   static async registerForPushNotifications(): Promise<string | null> {
//     try {
//       // Check if we already have a token stored
//       const storedToken = await AsyncStorage.getItem(this.deviceTokenKey);
//       if (storedToken) {
//         return storedToken;
//       }

//       const { status: existingStatus } =
//         await Notifications.getPermissionsAsync();
//       let finalStatus = existingStatus;

//       if (existingStatus !== "granted") {
//         const { status } = await Notifications.requestPermissionsAsync();
//         finalStatus = status;
//       }

//       if (finalStatus !== "granted") {
//         console.log("Failed to get push token for push notification!");
//         return null;
//       }

//       // Get the token
//       const token = await Notifications.getExpoPushTokenAsync({
//         projectId: process.env.EXPO_PROJECT_ID,
//       });

//       console.log("Push token:", token.data);

//       // Store token
//       await AsyncStorage.setItem(this.deviceTokenKey, token.data);

//       return token.data;
//     } catch (error) {
//       console.error("Error registering for push notifications:", error);
//       return null;
//     }
//   }

//   // Save device token to Supabase
//   static async saveDeviceToken(userId: string, token: string): Promise<void> {
//     try {
//       const { error } = await supabase.from("device_tokens").upsert({
//         user_id: userId,
//         token: token,
//         platform: Platform.OS,
//         active: true,
//         last_used: new Date().toISOString(),
//       });

//       if (error) {
//         console.error("Error saving device token:", error);
//       }
//     } catch (error) {
//       console.error("Error saving device token:", error);
//     }
//   }

//   // Send push notification directly from client
//   static async sendPushNotification(
//     token: string,
//     title: string,
//     body: string,
//     data?: any,
//   ): Promise<boolean> {
//     try {
//       const message = {
//         to: token,
//         sound: "default" as const,
//         title: title,
//         body: body,
//         data: data || {},
//         priority: "high" as const,
//       };

//       const response = await fetch("https://exp.host/--/api/v2/push/send", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify(message),
//       });

//       const result = await response.json();

//       if (result.data && result.data.status === "ok") {
//         return true;
//       } else {
//         console.error("Push notification error:", result);
//         return false;
//       }
//     } catch (error) {
//       console.error("Error sending push notification:", error);
//       return false;
//     }
//   }

//   // Send notification to all devices of a user
//   static async sendNotificationToUser(
//     userId: string,
//     title: string,
//     message: string,
//     type: Notification["type"] = "system",
//     data?: any,
//   ): Promise<boolean> {
//     try {
//       // Get user's device tokens
//       const { data: tokens, error } = await supabase
//         .from("device_tokens")
//         .select("token")
//         .eq("user_id", userId)
//         .eq("active", true);

//       if (error) {
//         console.error("Error fetching tokens:", error);
//         return false;
//       }

//       if (!tokens || tokens.length === 0) {
//         console.log("No device tokens found for user:", userId);
//         return false;
//       }

//       // Send push notifications
//       let success = true;
//       for (const token of tokens) {
//         const result = await this.sendPushNotification(
//           token.token,
//           title,
//           message,
//           data,
//         );
//         if (!result) success = false;
//       }

//       return success;
//     } catch (error) {
//       console.error("Error sending notification:", error);
//       return false;
//     }
//   }

//   // Create notification in database
//   static async createNotification(
//     userId: string,
//     title: string,
//     message: string,
//     type: Notification["type"] = "system",
//     data?: any,
//   ): Promise<Notification | null> {
//     try {
//       const { data: notification, error } = await supabase
//         .from("notifications")
//         .insert({
//           user_id: userId,
//           title,
//           message,
//           type,
//           data: data || null,
//           read: false,
//         })
//         .select()
//         .single();

//       if (error) {
//         console.error("Error creating notification:", error);
//         return null;
//       }

//       return notification;
//     } catch (error) {
//       console.error("Error creating notification:", error);
//       return null;
//     }
//   }

//   // Send notification to multiple users
//   static async sendBulkNotifications(
//     userIds: string[],
//     title: string,
//     message: string,
//     type: Notification["type"] = "system",
//     data?: any,
//   ): Promise<void> {
//     try {
//       // Create notifications in database
//       const notifications = userIds.map((userId) => ({
//         user_id: userId,
//         title,
//         message,
//         type,
//         data: data || null,
//         read: false,
//       }));

//       const { error } = await supabase
//         .from("notifications")
//         .insert(notifications);

//       if (error) {
//         console.error("Error creating bulk notifications:", error);
//         return;
//       }

//       // Send push notifications
//       for (const userId of userIds) {
//         await this.sendNotificationToUser(userId, title, message, type, data);
//       }
//     } catch (error) {
//       console.error("Error sending bulk notifications:", error);
//     }
//   }

//   // Send notification to all staff
//   static async sendStaffBroadcast(
//     title: string,
//     message: string,
//     type: Notification["type"] = "system",
//     data?: any,
//   ): Promise<void> {
//     try {
//       const { data: staff, error } = await supabase
//         .from("users")
//         .select("id")
//         .in("role", ["admin", "dispatcher", "driver", "conductor"]);

//       if (error) {
//         console.error("Error fetching staff:", error);
//         return;
//       }

//       if (staff && staff.length > 0) {
//         const staffIds = staff.map((s) => s.id);
//         await this.sendBulkNotifications(staffIds, title, message, type, data);
//       }
//     } catch (error) {
//       console.error("Error sending staff broadcast:", error);
//     }
//   }

//   // Get unread count
//   static async getUnreadCount(userId: string): Promise<number> {
//     try {
//       const { count, error } = await supabase
//         .from("notifications")
//         .select("*", { count: "exact", head: true })
//         .eq("user_id", userId)
//         .eq("read", false);

//       if (error) {
//         console.error("Error getting unread count:", error);
//         return 0;
//       }
//       return count || 0;
//     } catch (error) {
//       console.error("Error getting unread count:", error);
//       return 0;
//     }
//   }

//   // Get notifications
//   static async getNotifications(
//     userId: string,
//     limit: number = 50,
//   ): Promise<Notification[]> {
//     try {
//       const { data, error } = await supabase
//         .from("notifications")
//         .select("*")
//         .eq("user_id", userId)
//         .order("created_at", { ascending: false })
//         .limit(limit);

//       if (error) {
//         console.error("Error getting notifications:", error);
//         return [];
//       }
//       return data || [];
//     } catch (error) {
//       console.error("Error getting notifications:", error);
//       return [];
//     }
//   }

//   // Mark as read
//   static async markAsRead(notificationId: string): Promise<void> {
//     try {
//       const { error } = await supabase
//         .from("notifications")
//         .update({
//           read: true,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", notificationId);

//       if (error) {
//         console.error("Error marking as read:", error);
//       }
//     } catch (error) {
//       console.error("Error marking as read:", error);
//     }
//   }

//   // Mark all as read
//   static async markAllAsRead(userId: string): Promise<void> {
//     try {
//       const { error } = await supabase
//         .from("notifications")
//         .update({
//           read: true,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("user_id", userId)
//         .eq("read", false);

//       if (error) {
//         console.error("Error marking all as read:", error);
//       }
//     } catch (error) {
//       console.error("Error marking all as read:", error);
//     }
//   }

//   // Delete notification
//   static async deleteNotification(notificationId: string): Promise<void> {
//     try {
//       const { error } = await supabase
//         .from("notifications")
//         .delete()
//         .eq("id", notificationId);

//       if (error) {
//         console.error("Error deleting notification:", error);
//       }
//     } catch (error) {
//       console.error("Error deleting notification:", error);
//     }
//   }

//   // Subscribe to real-time notifications
//   static subscribeToNotifications(
//     userId: string,
//     callback: (notification: Notification) => void,
//   ) {
//     const channel = supabase
//       .channel(`notifications:${userId}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "INSERT",
//           schema: "public",
//           table: "notifications",
//           filter: `user_id=eq.${userId}`,
//         },
//         (payload) => {
//           callback(payload.new as Notification);
//         },
//       )
//       .subscribe();

//     return channel;
//   }
// }
