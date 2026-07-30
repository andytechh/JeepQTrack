import { supabase } from "@/src/shared/config/supabase";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditUser({ params, router }: any) {
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    role: "driver",
    phone_number: "",
    is_active: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("users")
          .select("id, email, display_name, role, phone_number, is_active")
          .eq("id", id)
          .single();
        if (data)
          setForm({
            display_name: data.display_name,
            email: data.email,
            role: data.role,
            phone_number: data.phone_number || "",
            is_active: data.is_active,
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
        .from("users")
        .update({
          display_name: form.display_name,
          role: form.role,
          phone_number: form.phone_number,
          is_active: form.is_active,
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
      <Text className="text-white font-bold mb-2">Edit User</Text>
      <TextInput
        value={form.display_name}
        onChangeText={(t) => setForm((s) => ({ ...s, display_name: t }))}
        className="bg-[#071022] text-white p-2.5 rounded-xl mb-2"
        placeholder="Display name"
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        value={form.email}
        editable={false}
        className="bg-[#071022] text-white p-2.5 rounded-xl mb-2"
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        value={form.role}
        onChangeText={(t) => setForm((s) => ({ ...s, role: t }))}
        className="bg-[#071022] text-white p-2.5 rounded-xl mb-2"
        placeholder="Role"
        placeholderTextColor="#94a3b8"
      />
      <TextInput
        value={form.phone_number}
        onChangeText={(t) => setForm((s) => ({ ...s, phone_number: t }))}
        className="bg-[#071022] text-white p-2.5 rounded-xl mb-4"
        placeholder="Phone"
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
