import { supabase } from "@/src/shared/config/supabase";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditJeepney({ params, router }: any) {
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plate_number: "",
    bracket: 1,
    capacity: 24,
    status: "waiting" as any,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("jeepneys")
          .select("id, plate_number, bracket, capacity, status")
          .eq("id", id)
          .single();
        if (data)
          setForm({
            plate_number: data.plate_number,
            bracket: data.bracket,
            capacity: data.capacity,
            status: data.status,
          });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await supabase
        .from("jeepneys")
        .update({
          plate_number: form.plate_number,
          bracket: form.bracket,
          capacity: form.capacity,
          status: form.status,
        })
        .eq("id", id);
      router.back();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-[#0a1628]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-[#0a1628] p-4">
      <Text className="text-white font-bold mb-2">Edit Jeepney</Text>
      <TextInput
        value={form.plate_number}
        onChangeText={(t) => setForm((s) => ({ ...s, plate_number: t }))}
        className="bg-[#071022] text-white p-2.5 rounded-xl mb-2"
        placeholder="Plate number"
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        value={String(form.bracket)}
        onChangeText={(t) =>
          setForm((s) => ({ ...s, bracket: Number(t) || 1 }))
        }
        className="bg-[#071022] text-white p-2.5 rounded-xl mb-2"
        placeholder="Bracket"
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        value={String(form.capacity)}
        onChangeText={(t) =>
          setForm((s) => ({ ...s, capacity: Number(t) || 24 }))
        }
        className="bg-[#071022] text-white p-2.5 rounded-xl mb-4"
        placeholder="Capacity"
        placeholderTextColor="#94a3b8"
      />

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className="bg-[#0ea5e9] py-3 items-center rounded-xl"
      >
        <Text className="text-white font-bold">
          {saving ? "Saving..." : "Save"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
