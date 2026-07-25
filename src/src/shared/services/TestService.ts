// src/shared/services/TestService.ts
import { supabase } from "../config/supabase";

export class TestService {
  static async testConnection() {
    try {
      // Test query to check connection
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("count")
        .limit(1);

      if (error) {
        console.error("❌ Database connection failed:", error);
        return false;
      }

      console.log("✅ Database connected successfully");
      return true;
    } catch (error) {
      console.error("❌ Database connection error:", error);
      return false;
    }
  }

  static async testChatSetup() {
    try {
      // Test inserting a test message
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          message: "Test message",
          sender_id: "test-user-id", // Replace with actual UUID
          room_id: "staff-general-chat",
        })
        .select();

      if (error) {
        console.error("❌ Chat setup test failed:", error);
        return false;
      }

      console.log("✅ Chat setup test passed");
      return true;
    } catch (error) {
      console.error("❌ Chat setup test error:", error);
      return false;
    }
  }
}
