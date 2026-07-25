import { supabase } from "../config/supabase";

export interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  room_id: string;
  created_at: string;
  updated_at?: string;
  read_by?: string[];
  status?: "sending" | "sent" | "delivered" | "read";
  sender?: {
    id: string;
    display_name: string;
    role: string;
    email: string;
    avatar_url?: string;
  };
}

export class ChatService {
  private static readonly ROOM_ID = "staff-general-chat";
  private static readonly MESSAGE_LIMIT = 100;
  private static userCache = new Map<string, any>();

  static async initializeMainRoom(): Promise<void> {
    try {
      const { data: existingRoom } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("id", this.ROOM_ID)
        .single();

      if (!existingRoom) {
        await supabase.from("chat_rooms").insert({
          id: this.ROOM_ID,
          name: "Staff General Chat",
          type: "staff",
        });
      }
    } catch (error) {
      console.error("Failed to initialize chat room:", error);
    }
  }

  static async joinRoom(userId: string): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from("chat_room_members")
        .select("id")
        .eq("room_id", this.ROOM_ID)
        .eq("user_id", userId)
        .single();

      if (!existing) {
        await supabase.from("chat_room_members").insert({
          room_id: this.ROOM_ID,
          user_id: userId,
          joined_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Failed to join chat room:", error);
    }
  }

  private static async fetchUsers(
    userIds: string[],
  ): Promise<Map<string, any>> {
    // Check cache first
    const uncachedIds = userIds.filter((id) => !this.userCache.has(id));

    if (uncachedIds.length === 0) {
      return this.userCache;
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("id, display_name, role, email, avatar_url")
      .in("id", uncachedIds);

    if (error) {
      console.error("Failed to fetch users:", error);
      return this.userCache;
    }

    // Update cache
    users?.forEach((user) => {
      this.userCache.set(user.id, user);
    });

    return this.userCache;
  }

  static async getMessages(): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select(
          "id, message, sender_id, room_id, created_at, updated_at, read_by",
        )
        .eq("room_id", this.ROOM_ID)
        .order("created_at", { ascending: true })
        .limit(this.MESSAGE_LIMIT);

      if (error) throw error;
      if (!messages?.length) return [];

      // Get unique sender IDs and fetch users
      const senderIds = [...new Set(messages.map((m) => m.sender_id))];
      const userMap = await this.fetchUsers(senderIds);

      return messages.map((message) => ({
        ...message,
        sender: userMap.get(message.sender_id) || {
          id: message.sender_id,
          display_name: "Unknown",
          role: "staff",
          email: "",
        },
      }));
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      throw error;
    }
  }

  static async sendMessage(
    userId: string,
    message: string,
  ): Promise<ChatMessage> {
    try {
      // Insert message
      const { data: newMessage, error: insertError } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: userId,
          message: message.trim(),
          room_id: this.ROOM_ID,
          read_by: [userId],
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Get sender from cache or fetch
      let sender = this.userCache.get(userId);
      if (!sender) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, display_name, role, email, avatar_url")
          .eq("id", userId)
          .single();

        if (!userError && userData) {
          sender = userData;
          this.userCache.set(userId, sender);
        }
      }

      const completeMessage: ChatMessage = {
        ...newMessage,
        sender: sender || {
          id: userId,
          display_name: "Unknown",
          role: "staff",
          email: "",
        },
      };

      // Send notifications in background
      this.sendMessageNotifications(
        userId,
        message,
        sender?.display_name || "User",
      );

      return completeMessage;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  private static async sendMessageNotifications(
    senderId: string,
    message: string,
    senderName: string,
  ): Promise<void> {
    try {
      const { data: members, error } = await supabase
        .from("chat_room_members")
        .select("user_id")
        .eq("room_id", this.ROOM_ID)
        .neq("user_id", senderId);

      if (error || !members?.length) return;

      const memberIds = members.map((m) => m.user_id);
      const truncatedMessage =
        message.length > 50 ? `${message.substring(0, 50)}...` : message;

      const notifications = memberIds.map((userId) => ({
        user_id: userId,
        title: "New Chat Message",
        message: `${senderName}: ${truncatedMessage}`,
        type: "chat",
        data: {
          sender_id: senderId,
          room_id: this.ROOM_ID,
        },
        read: false,
      }));

      await supabase.from("notifications").insert(notifications);
    } catch (error) {
      // Silent fail for notifications
      console.error("Failed to send notifications:", error);
    }
  }

  static subscribeToRoom(callback: (message: ChatMessage) => void) {
    const channel = supabase
      .channel(`room:${this.ROOM_ID}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${this.ROOM_ID}`,
        },
        async (payload) => {
          try {
            // Get message data
            const { data: message, error: messageError } = await supabase
              .from("chat_messages")
              .select(
                "id, message, sender_id, room_id, created_at, updated_at, read_by",
              )
              .eq("id", payload.new.id)
              .single();

            if (messageError) throw messageError;

            // Get sender from cache or fetch
            let sender = this.userCache.get(message.sender_id);
            if (!sender) {
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id, display_name, role, email, avatar_url")
                .eq("id", message.sender_id)
                .single();

              if (!userError && userData) {
                sender = userData;
                this.userCache.set(message.sender_id, sender);
              }
            }

            const completeMessage: ChatMessage = {
              ...message,
              sender: sender || {
                id: message.sender_id,
                display_name: "Unknown",
                role: "staff",
                email: "",
              },
            };

            callback(completeMessage);
          } catch (error) {
            console.error("Failed to process subscription message:", error);
          }
        },
      )
      .subscribe();

    return channel;
  }

  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { data: unreadMessages } = await supabase
        .from("chat_messages")
        .select("id, read_by")
        .eq("room_id", this.ROOM_ID)
        .neq("sender_id", userId)
        .not("read_by", "cs", `{${userId}}`);

      if (!unreadMessages?.length) return;

      // Batch update for better performance
      const updates = unreadMessages
        .map((msg) => {
          const readBy = msg.read_by || [];
          if (!readBy.includes(userId)) {
            return supabase
              .from("chat_messages")
              .update({ read_by: [...readBy, userId] })
              .eq("id", msg.id);
          }
          return null;
        })
        .filter(Boolean);

      await Promise.all(updates);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }

  static async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const { data: message } = await supabase
        .from("chat_messages")
        .select("read_by")
        .eq("id", messageId)
        .single();

      if (message) {
        const readBy = message.read_by || [];
        if (!readBy.includes(userId)) {
          await supabase
            .from("chat_messages")
            .update({ read_by: [...readBy, userId] })
            .eq("id", messageId);
        }
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  // Optional: Clear cache (useful for logout)
  static clearCache(): void {
    this.userCache.clear();
  }
}
