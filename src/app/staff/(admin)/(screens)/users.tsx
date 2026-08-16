// app/staff/(admin)/(tabs)/users.tsx
import { router } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import {
  AdminService,
  AdminUser,
  UserRole,
} from "../../../../src/shared/services/AdminService";

const ROLE_FILTERS = [
  { key: "all", label: "All" },
  { key: "driver", label: "Drivers" },
  { key: "dispatcher", label: "Dispatchers" },
  { key: "admin", label: "Admins" },
];

export default function UsersScreen() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const loadUsers = useCallback(
    async (opts?: { search?: string; role?: UserRole | "all" }) => {
      try {
        setLoading(true);
        const data = await AdminService.getUsers({
          search: opts?.search ?? search,
          role: opts?.role ?? roleFilter,
        });
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, roleFilter],
  );

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      <View className="px-4 pt-3">
        <View
          className={`flex-row items-center px-3 py-2.5 rounded-xl border ${
            isDark
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          }`}
        >
          <Search size={18} color={isDark ? "#94a3b8" : "#94a3b8"} />
          <TextInput
            className={`flex-1 text-base ml-2 ${isDark ? "text-white" : "text-slate-900"}`}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadUsers()}
            placeholder="Search name or email"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            returnKeyType="search"
          />
        </View>

        <FlatList
          data={ROLE_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 12 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => setRoleFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-full ${
                roleFilter === f.key
                  ? "bg-sky-500"
                  : isDark
                    ? "bg-slate-800"
                    : "bg-white"
              }`}
            >
              <Text
                className={`text-xs font-medium ${roleFilter === f.key ? "text-white" : isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && users.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/staff/(admin)/users/${item.id}`)}
              className={`p-4 rounded-xl mb-3 flex-row items-center justify-between ${
                isDark ? "bg-slate-800" : "bg-white"
              } border ${isDark ? "border-slate-700" : "border-slate-200"}`}
            >
              <View className="flex-1">
                <Text
                  className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  {item.display_name || item.email}
                </Text>
                <Text
                  className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  {item.email} • {item.role}
                </Text>
              </View>
              <View
                className={`px-2.5 py-1 rounded-full ${
                  item.is_active
                    ? isDark
                      ? "bg-green-500/20"
                      : "bg-green-50"
                    : isDark
                      ? "bg-red-500/20"
                      : "bg-red-50"
                }`}
              >
                <Text
                  className={`text-[10px] font-medium ${item.is_active ? "text-green-600" : "text-red-600"}`}
                >
                  {item.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadUsers();
              }}
              tintColor="#0ea5e9"
            />
          }
          ListEmptyComponent={
            <View className="py-8">
              <Text
                className={`text-center ${isDark ? "text-slate-400" : "text-slate-400"}`}
              >
                No users found.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        onPress={() => router.push("/staff/(admin)/users/new")}
        className="absolute right-5 bottom-6 w-14 h-14 rounded-full bg-sky-500 items-center justify-center shadow-lg shadow-sky-500/40"
      >
        <Plus size={26} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
