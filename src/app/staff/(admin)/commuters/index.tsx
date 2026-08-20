import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { colors } from "@/src/shared/constants/theme";

import {
  AdminCommuterRecord,
  useAdminCommuters,
} from "@/src/shared/hooks/admin/useAdminCommuters";

type Filter = "all" | "active" | "inactive";

const FILTERS: {
  label: string;
  value: Filter;
}[] = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Active",
    value: "active",
  },
  {
    label: "Inactive",
    value: "inactive",
  },
];

export default function AdminCommutersScreen() {
  const router = useRouter();

  const { commuters, loading, refreshing, error, refresh } =
    useAdminCommuters();

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<Filter>("all");

  const filteredCommuters = useMemo(() => {
    const query = search.trim().toLowerCase();

    return commuters.filter((commuter) => {
      const matchesSearch =
        !query ||
        commuter.display_name.toLowerCase().includes(query) ||
        commuter.email.toLowerCase().includes(query) ||
        commuter.phone_number?.toLowerCase().includes(query);

      let matchesFilter = true;

      if (filter === "active") {
        matchesFilter = commuter.is_active;
      }

      if (filter === "inactive") {
        matchesFilter = !commuter.is_active;
      }

      return matchesSearch && matchesFilter;
    });
  }, [commuters, search, filter]);

  const activeCount = useMemo(() => {
    return commuters.filter((commuter) => commuter.is_active).length;
  }, [commuters]);

  const inactiveCount = commuters.length - activeCount;

  if (loading) {
    return (
      <OceanBackground intensity={0.25}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface shadow-clay">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
              Loading commuters...
            </Text>

            <Text className="mt-1 text-center text-[11px] text-ink-muted">
              Getting the latest commuter information
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.28}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primaryDark}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 140,
          }}
        >
          {/* HEADER */}

          <View className="flex-row items-center">
            <View className="h-[50px] w-[50px] items-center justify-center rounded-[18px] bg-ocean-100">
              <Users size={24} color={colors.primaryDark} strokeWidth={2.4} />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-ocean-700">
                MANAGEMENT
              </Text>

              <Text className="mt-0.5 text-[25px] font-extrabold text-ink-dark">
                Commuters
              </Text>
            </View>

            <View className="rounded-full bg-ocean-100 px-3 py-2">
              <Text className="text-[11px] font-extrabold text-ocean-700">
                {commuters.length}
              </Text>
            </View>
          </View>

          {/* SUMMARY */}

          <View className="mt-5 flex-row">
            <SummaryCard
              label="Total"
              value={commuters.length}
              icon={
                <Users size={18} color={colors.primaryDark} strokeWidth={2.3} />
              }
            />

            <View className="w-3" />

            <SummaryCard
              label="Active"
              value={activeCount}
              icon={
                <View className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              }
            />

            <View className="w-3" />

            <SummaryCard
              label="Inactive"
              value={inactiveCount}
              icon={<View className="h-2.5 w-2.5 rounded-full bg-slate-400" />}
            />
          </View>

          {/* SEARCH */}

          <View className="mt-5 flex-row items-center rounded-[20px] border border-white/90 bg-clay-surface px-4">
            <Search size={18} color="#64748B" strokeWidth={2.2} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search commuter, email, or phone"
              placeholderTextColor="#94A3B8"
              className="ml-3 flex-1 py-4 text-[12px] font-medium text-ink-dark"
            />

            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <XCircle size={18} color="#94A3B8" strokeWidth={2.2} />
              </Pressable>
            )}
          </View>

          {/* FILTERS */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
          >
            {FILTERS.map((item) => {
              const selected = filter === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  className={`mr-2 rounded-full px-4 py-2.5 ${
                    selected ? "bg-ocean-400" : "bg-white/80"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-extrabold ${
                      selected ? "text-white" : "text-ink-secondary"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ERROR */}

          {error && (
            <View className="mt-5 rounded-[24px] border border-red-100 bg-white/90 p-5">
              <View className="flex-row items-center">
                <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-red-50">
                  <AlertTriangle size={21} color="#DC2626" strokeWidth={2.4} />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-extrabold text-ink-dark">
                    Commuters unavailable
                  </Text>

                  <Text className="mt-1 text-[11px] leading-[17px] text-ink-secondary">
                    {error}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={refresh}
                className="mt-4 h-[44px] flex-row items-center justify-center rounded-full bg-ocean-400"
              >
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />

                <Text className="ml-2 text-[12px] font-extrabold text-white">
                  Retry
                </Text>
              </Pressable>
            </View>
          )}

          {/* LIST HEADER */}

          <View className="mb-3 mt-7 flex-row items-end justify-between">
            <View>
              <Text className="text-[16px] font-extrabold text-ink-dark">
                Commuter Accounts
              </Text>

              <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
                {filteredCommuters.length} commuters shown
              </Text>
            </View>
          </View>

          {/* LIST */}

          {filteredCommuters.length === 0 ? (
            <EmptyCommuters search={search} />
          ) : (
            <View>
              {filteredCommuters.map((commuter) => (
                <CommuterCard
                  key={commuter.id}
                  commuter={commuter}
                  onPress={() =>
                    router.push(`/staff/(admin)/commuters/${commuter.id}`)
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <View className="flex-1 rounded-[20px] border border-white/90 bg-clay-surface p-4">
      <View className="flex-row items-center">{icon}</View>

      <Text className="mt-3 text-[20px] font-extrabold text-ink-dark">
        {value}
      </Text>

      <Text className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
        {label}
      </Text>
    </View>
  );
}

/* ============================================================
   COMMUTER CARD
============================================================ */

function CommuterCard({
  commuter,
  onPress,
}: {
  commuter: AdminCommuterRecord;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-[25px] border border-white/90 bg-clay-surface p-5"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.045,
        shadowRadius: 9,
        elevation: 2,
      }}
    >
      {/* TOP */}

      <View className="flex-row items-center">
        <View className="h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-[16px] bg-ocean-100">
          {commuter.avatar_url ? (
            <Text className="text-[18px] font-extrabold text-ocean-700">
              {getInitials(commuter.display_name)}
            </Text>
          ) : (
            <UserRound size={24} color={colors.primaryDark} strokeWidth={2.3} />
          )}
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[14px] font-extrabold text-ink-dark"
          >
            {commuter.display_name}
          </Text>

          <Text
            numberOfLines={1}
            className="mt-0.5 text-[10px] font-medium text-ink-secondary"
          >
            {commuter.email || "No email address"}
          </Text>
        </View>

        <View
          className={`rounded-full px-3 py-1.5 ${
            commuter.is_active ? "bg-emerald-50" : "bg-slate-100"
          }`}
        >
          <Text
            className={`text-[9px] font-extrabold uppercase ${
              commuter.is_active ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {commuter.is_active ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      {/* DETAILS */}

      <View className="mt-5 flex-row">
        <InfoBlock
          icon={<Mail size={14} color="#64748B" strokeWidth={2.3} />}
          label="Email"
          value={commuter.email || "Not provided"}
        />

        <InfoBlock
          icon={<Phone size={14} color="#64748B" strokeWidth={2.3} />}
          label="Phone"
          value={commuter.phone_number || "Not provided"}
        />
      </View>

      <View className="mt-4 flex-row">
        <InfoBlock
          icon={<MapPin size={14} color="#64748B" strokeWidth={2.3} />}
          label="Terminal"
          value={
            commuter.preferred_terminal != null
              ? `Terminal ${commuter.preferred_terminal}`
              : "Not set"
          }
        />

        <InfoBlock
          icon={<Users size={14} color="#64748B" strokeWidth={2.3} />}
          label="Bracket"
          value={
            commuter.preferred_bracket != null
              ? String(commuter.preferred_bracket)
              : "Not set"
          }
        />
      </View>

      {/* FOOTER */}

      <View className="mt-5 flex-row items-center justify-between">
        <View className="flex-row items-center">
          {commuter.is_active ? (
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
          ) : (
            <View className="h-2 w-2 rounded-full bg-slate-400" />
          )}

          <Text className="ml-2 text-[10px] font-semibold text-ink-secondary">
            {commuter.is_active ? "Account is active" : "Account is inactive"}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Text className="mr-1 text-[10px] font-extrabold text-ocean-700">
            View details
          </Text>

          <ChevronRight
            size={15}
            color={colors.primaryDark}
            strokeWidth={2.3}
          />
        </View>
      </View>
    </Pressable>
  );
}

/* ============================================================
   INFO BLOCK
============================================================ */

function InfoBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 pr-2">
      <View className="flex-row items-center">
        {icon}

        <Text className="ml-1 text-[9px] font-bold uppercase tracking-[0.4px] text-ink-muted">
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        className="mt-1 text-[11px] font-extrabold text-ink-dark"
      >
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyCommuters({ search }: { search: string }) {
  return (
    <View className="items-center rounded-[25px] border border-white/90 bg-white/70 px-6 py-8">
      <View className="h-[54px] w-[54px] items-center justify-center rounded-[17px] bg-ocean-100">
        <Users size={24} color={colors.primaryDark} strokeWidth={2.3} />
      </View>

      <Text className="mt-3 text-[14px] font-extrabold text-ink-dark">
        {search ? "No commuters found" : "No commuters available"}
      </Text>

      <Text className="mt-1 max-w-[280px] text-center text-[10px] leading-[16px] text-ink-secondary">
        {search
          ? "Try searching with a different name, email, or phone number."
          : "There are currently no commuter accounts."}
      </Text>
    </View>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
