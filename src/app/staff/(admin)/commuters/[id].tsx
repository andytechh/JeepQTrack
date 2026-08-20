import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { supabase } from "@/src/shared/config/supabase";
import { colors } from "@/src/shared/constants/theme";

interface CommuterDetails {
  id: string;

  email: string;
  phone_number: string | null;
  display_name: string;

  role: "commuter";

  is_active: boolean;

  avatar_url: string | null;

  preferred_terminal: number | null;
  preferred_bracket: number | null;

  created_at: string;
  updated_at: string;
}

export default function AdminCommuterDetailsScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const [commuter, setCommuter] = useState<CommuterDetails | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No commuter account was specified.");
      setLoading(false);
      return;
    }

    loadCommuter(id);
  }, [id]);

  const loadCommuter = async (commuterId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("users")
        .select(
          `
          id,
          email,
          phone_number,
          display_name,
          role,
          is_active,
          avatar_url,
          preferred_terminal,
          preferred_bracket,
          created_at,
          updated_at
        `,
        )
        .eq("id", commuterId)
        .eq("role", "commuter")
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        setError("Commuter account could not be found.");
        setCommuter(null);
        return;
      }

      setCommuter({
        id: data.id,
        email: data.email ?? "",
        phone_number: data.phone_number ?? null,
        display_name: data.display_name ?? "Unnamed Commuter",
        role: "commuter",
        is_active: data.is_active ?? true,
        avatar_url: data.avatar_url ?? null,
        preferred_terminal:
          data.preferred_terminal == null
            ? null
            : Number(data.preferred_terminal),
        preferred_bracket:
          data.preferred_bracket == null
            ? null
            : Number(data.preferred_bracket),
        created_at: data.created_at ?? "",
        updated_at: data.updated_at ?? "",
      });
    } catch (err: any) {
      console.error("❌ Failed to load commuter details:", err);

      setError(err?.message ?? "Unable to load commuter account details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <OceanBackground intensity={0.25}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
              Loading commuter...
            </Text>

            <Text className="mt-1 text-[11px] text-ink-muted">
              Getting account information
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  if (error || !commuter) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-5 pt-4">
            <Header onBack={() => router.back()} />

            <View className="mt-8 items-center rounded-[26px] border border-white/90 bg-clay-surface px-6 py-8">
              <View className="h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-red-50">
                <XCircle size={27} color="#DC2626" strokeWidth={2.3} />
              </View>

              <Text className="mt-4 text-[16px] font-extrabold text-ink-dark">
                Commuter not found
              </Text>

              <Text className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary">
                {error ?? "This commuter account may have been removed."}
              </Text>

              <Pressable
                onPress={() => router.back()}
                className="mt-5 h-[44px] flex-row items-center rounded-full bg-ocean-400 px-6"
              >
                <ArrowLeft size={16} color="#FFFFFF" strokeWidth={2.5} />

                <Text className="ml-2 text-[12px] font-extrabold text-white">
                  Go back
                </Text>
              </Pressable>
            </View>
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
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 150,
          }}
        >
          {/* HEADER */}

          <Header onBack={() => router.back()} />

          {/* PROFILE */}

          <View className="mt-5 items-center rounded-[28px] border border-white/90 bg-clay-surface px-5 py-7">
            <View className="h-[82px] w-[82px] items-center justify-center rounded-[26px] bg-ocean-100">
              {commuter.avatar_url ? (
                <Text className="text-[25px] font-extrabold text-ocean-700">
                  {getInitials(commuter.display_name)}
                </Text>
              ) : (
                <UserRound
                  size={38}
                  color={colors.primaryDark}
                  strokeWidth={2.2}
                />
              )}
            </View>

            <Text
              numberOfLines={1}
              className="mt-4 text-[21px] font-extrabold text-ink-dark"
            >
              {commuter.display_name}
            </Text>

            <Text className="mt-1 text-[11px] font-medium text-ink-secondary">
              {commuter.email || "No email address"}
            </Text>

            <View
              className={`mt-4 flex-row items-center rounded-full px-4 py-2 ${
                commuter.is_active ? "bg-emerald-50" : "bg-slate-100"
              }`}
            >
              {commuter.is_active ? (
                <CheckCircle2 size={14} color="#059669" strokeWidth={2.4} />
              ) : (
                <XCircle size={14} color="#64748B" strokeWidth={2.4} />
              )}

              <Text
                className={`ml-1.5 text-[10px] font-extrabold uppercase ${
                  commuter.is_active ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                {commuter.is_active ? "Active Account" : "Inactive Account"}
              </Text>
            </View>
          </View>

          {/* ACCOUNT INFORMATION */}

          <SectionTitle
            icon={
              <UserRound
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Account Information"
          />

          <View className="overflow-hidden rounded-[24px] border border-white/90 bg-clay-surface">
            <DetailRow
              icon={<UserRound size={17} color="#64748B" strokeWidth={2.2} />}
              label="Display Name"
              value={commuter.display_name}
            />

            <DetailRow
              icon={<Mail size={17} color="#64748B" strokeWidth={2.2} />}
              label="Email"
              value={commuter.email || "Not provided"}
            />

            <DetailRow
              icon={<Phone size={17} color="#64748B" strokeWidth={2.2} />}
              label="Phone Number"
              value={commuter.phone_number || "Not provided"}
            />

            <DetailRow
              icon={<ShieldCheck size={17} color="#64748B" strokeWidth={2.2} />}
              label="Role"
              value="Commuter"
            />
          </View>

          {/* PREFERENCES */}

          <SectionTitle
            icon={
              <MapPin size={17} color={colors.primaryDark} strokeWidth={2.3} />
            }
            title="Travel Preferences"
          />

          <View className="rounded-[24px] border border-white/90 bg-clay-surface p-5">
            <PreferenceBlock
              icon={
                <MapPin
                  size={18}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              }
              label="Preferred Terminal"
              value={
                commuter.preferred_terminal != null
                  ? `Terminal ${commuter.preferred_terminal}`
                  : "Not configured"
              }
            />

            <View className="my-4 h-px bg-slate-200/60" />

            <PreferenceBlock
              icon={
                <Users size={18} color={colors.primaryDark} strokeWidth={2.3} />
              }
              label="Preferred Bracket"
              value={
                commuter.preferred_bracket != null
                  ? String(commuter.preferred_bracket)
                  : "Not configured"
              }
            />
          </View>

          {/* ACCOUNT STATUS */}

          <SectionTitle
            icon={
              <ShieldCheck
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Account Status"
          />

          <View className="rounded-[24px] border border-white/90 bg-clay-surface p-5">
            <View className="flex-row items-center">
              <View
                className={`h-[44px] w-[44px] items-center justify-center rounded-[15px] ${
                  commuter.is_active ? "bg-emerald-50" : "bg-slate-100"
                }`}
              >
                {commuter.is_active ? (
                  <CheckCircle2 size={22} color="#059669" strokeWidth={2.4} />
                ) : (
                  <XCircle size={22} color="#64748B" strokeWidth={2.4} />
                )}
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[13px] font-extrabold text-ink-dark">
                  {commuter.is_active
                    ? "Account is active"
                    : "Account is inactive"}
                </Text>

                <Text className="mt-1 text-[10px] leading-[15px] text-ink-secondary">
                  {commuter.is_active
                    ? "This commuter account is currently enabled."
                    : "This commuter account is currently disabled."}
                </Text>
              </View>
            </View>
          </View>

          {/* ACCOUNT TIMESTAMPS */}

          <SectionTitle
            icon={
              <CalendarDays
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Account History"
          />

          <View className="rounded-[24px] border border-white/90 bg-clay-surface p-5">
            <TimestampRow
              label="Account Created"
              value={formatDate(commuter.created_at)}
            />

            <View className="my-4 h-px bg-slate-200/60" />

            <TimestampRow
              label="Last Updated"
              value={formatDate(commuter.updated_at)}
            />
          </View>

          {/* ADMIN NOTE */}

          <View className="mt-5 rounded-[22px] border border-white/80 bg-ocean-50/70 p-5">
            <View className="flex-row">
              <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-ocean-100">
                <ShieldCheck
                  size={18}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[12px] font-extrabold text-ink-dark">
                  Administrator View
                </Text>

                <Text className="mt-1 text-[10px] leading-[16px] text-ink-secondary">
                  This screen displays the commuter information available to
                  administrators from the users table.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}

/* ============================================================
   HEADER
============================================================ */

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={onBack}
        className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface"
        hitSlop={8}
      >
        <ArrowLeft size={20} color="#475569" strokeWidth={2.5} />
      </Pressable>

      <View className="ml-3 flex-1">
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-ocean-700">
          MANAGEMENT
        </Text>

        <Text className="mt-0.5 text-[21px] font-extrabold text-ink-dark">
          Commuter Details
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   SECTION TITLE
============================================================ */

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="mb-3 mt-7 flex-row items-center">
      <View className="h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ocean-100">
        {icon}
      </View>

      <Text className="ml-2 text-[15px] font-extrabold text-ink-dark">
        {title}
      </Text>
    </View>
  );
}

/* ============================================================
   DETAIL ROW
============================================================ */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="min-h-[70px] flex-row items-center px-5">
      <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-slate-100">
        {icon}
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
          {label}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-1 text-[12px] font-extrabold text-ink-dark"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   PREFERENCE
============================================================ */

function PreferenceBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
        {icon}
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
          {label}
        </Text>

        <Text className="mt-1 text-[12px] font-extrabold text-ink-dark">
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   TIMESTAMP
============================================================ */

function TimestampRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
        {label}
      </Text>

      <Text className="mt-1 text-[12px] font-extrabold text-ink-dark">
        {value}
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

function formatDate(value: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
