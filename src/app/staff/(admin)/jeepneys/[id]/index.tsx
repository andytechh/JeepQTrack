import { supabase } from "@/src/shared/config/supabase";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function JeepneyDetails({ params }: any) {
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [jeep, setJeep] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("jeepneys")
          .select("*")
          .eq("id", id)
          .single();
        setJeep(data);
      } catch (err) {
        console.error(err);
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
  if (!jeep)
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-[#0a1628]">
        <Text className="text-[#94a3b8]">Jeepney not found</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-[#0a1628] p-4">
      <Text className="text-white text-xl font-bold">{jeep.plate_number}</Text>
      <Text className="text-[#94a3b8] mt-2">Bracket: {jeep.bracket}</Text>
      <Text className="text-[#94a3b8] mt-2">Status: {jeep.status}</Text>

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
