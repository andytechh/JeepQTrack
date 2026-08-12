// app/staff/(admin)/users/new.tsx (light theme)
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import {
  AdminService,
  UserRole,
} from "../../../../src/shared/services/AdminService";

const ROLES: UserRole[] = ["driver", "dispatcher", "admin"];

export default function NewUser() {
  const { isDark } = useTheme();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    password: "",
    role: "driver" as UserRole,
    phone_number: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!form.display_name.trim() || !form.email.trim() || !form.password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      setSaving(true);
      await AdminService.createUser(form);
      Toast.show({ type: "success", text1: "User created" });
      router.back();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-3">
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 flex-1">
          Add User
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="gap-4">
          <Field label="Full name" isDark={isDark}>
            <TextInput
              value={form.display_name}
              onChangeText={(t) => setForm((s) => ({ ...s, display_name: t }))}
              placeholder="Juan Dela Cruz"
              className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-900"}`}
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            />
          </Field>

          <Field label="Email" isDark={isDark}>
            <TextInput
              value={form.email}
              onChangeText={(t) => setForm((s) => ({ ...s, email: t }))}
              placeholder="name@example.com"
              className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-900"}`}
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </Field>

          <Field label="Temporary password" isDark={isDark}>
            <TextInput
              value={form.password}
              onChangeText={(t) => setForm((s) => ({ ...s, password: t }))}
              placeholder="At least 8 characters"
              className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-900"}`}
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              secureTextEntry
            />
          </Field>

          <Field label="Phone number" isDark={isDark}>
            <TextInput
              value={form.phone_number}
              onChangeText={(t) => setForm((s) => ({ ...s, phone_number: t }))}
              placeholder="09XXXXXXXXX"
              className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-900"}`}
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              keyboardType="phone-pad"
            />
          </Field>

          <Text
            className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
          >
            Role
          </Text>
          <View className="flex-row gap-3">
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setForm((s) => ({ ...s, role: r }))}
                className={`flex-1 py-2.5 rounded-xl items-center ${
                  form.role === r
                    ? "bg-sky-500"
                    : isDark
                      ? "bg-slate-700"
                      : "bg-slate-100"
                }`}
              >
                <Text
                  className={`font-semibold ${form.role === r ? "text-white" : isDark ? "text-slate-300" : "text-slate-600"}`}
                >
                  {r[0].toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && <Text className="text-red-500 text-sm">{error}</Text>}

          <TouchableOpacity
            onPress={handleCreate}
            disabled={saving}
            className={`py-3.5 rounded-xl items-center ${saving ? "bg-slate-400" : "bg-sky-500"}`}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Create User</Text>
            )}
          </TouchableOpacity>

          <Text
            className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"} text-center mt-2`}
          >
            This calls the "admin-create-user" Edge Function.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <View>
      <Text
        className={`text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}
