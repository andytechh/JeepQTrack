import { supabase } from "@/src/shared/config/supabase";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserDetails({ params }: any) {
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("users")
          .select("id, email, display_name, role, phone_number, is_active")
          .eq("id", id)
          .single();
        setUser(data);
      } catch (err) {
        console.error("Failed to load user", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading)
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );

  if (!user)
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-[#0a1628]">
        <Text className="text-[#94a3b8]">User not found</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-[#0a1628] p-4">
      <Text className="text-white text-xl font-bold">
        {user.display_name || user.email}
      </Text>
      <Text className="text-[#94a3b8] mt-2">Role: {user.role}</Text>
      <Text className="text-[#94a3b8] mt-2">
        Phone: {user.phone_number || "—"}
      </Text>

      <View className="mt-5">
        <TouchableOpacity
          className="bg-[#0ea5e9] py-3 rounded-xl items-center"
          onPress={() => {
            /* navigate to edit */
          }}
        >
          <Text className="text-white font-bold">Edit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
