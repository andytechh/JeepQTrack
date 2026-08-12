// app/staff/(dispatcher)/jeepney/[id].tsx
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, MessageCircle, Navigation } from "lucide-react-native";
import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator as RNActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Card } from "../../../../src/shared/components/ui/Card";
import { StatusPill } from "../../../../src/shared/components/ui/StatusPill";
import { supabase } from "../../../../src/shared/config/supabase";
import { theme } from "../../../../src/shared/constants/theme";
import { useTheme } from "../../../../src/shared/context/ThemeContext";
import { useDispatcherGPS } from "../../../../src/shared/hooks/useDispatcherGPS";
import { DispatchService } from "../../../../src/shared/services/DispatchService";

interface JeepneyDetail {
  id: string;
  plate_number: string;
  driver_name: string | null;
  status: string;
  capacity: number;
  current_occupancy: number;
  queue_position: number | null;
  bracket: number;
  terminal_id: number;
  loading_started_at: string | null;
  loading_ends_at: string | null;
}

function occupancyStatus(occupancy: number, capacity: number) {
  if (!capacity)
    return { label: "No occupancy data", color: theme.colors.status.offline };
  const pct = Math.round((occupancy / capacity) * 100);
  if (pct >= 100)
    return { label: "FULL", color: theme.colors.status.error, pct };
  if (pct >= 90)
    return { label: "NEAR CAPACITY", color: theme.colors.status.error, pct };
  if (pct >= 70)
    return { label: "MODERATE", color: theme.colors.status.busy, pct };
  return { label: "NORMAL", color: theme.colors.status.online, pct };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { isDark } = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text
        className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}
      >
        {title}
      </Text>
      <Card style={{ padding: theme.spacing.md }}>{children}</Card>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { isDark } = useTheme();
  return (
    <View className="flex-row justify-between items-center py-1.5">
      <Text
        className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
      >
        {label}
      </Text>
      <Text
        className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
      >
        {value}
      </Text>
    </View>
  );
}

export default function JeepneyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useTheme();
  const { markers } = useDispatcherGPS();

  const [jeepney, setJeepney] = useState<JeepneyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const fetchJeepney = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("jeepneys")
        .select(
          "id, plate_number, driver_name, status, capacity, current_occupancy, queue_position, bracket, terminal_id, loading_started_at, loading_ends_at",
        )
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      setJeepney(data);
    } catch (err: any) {
      setError(err.message || "Unable to load jeepney details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJeepney();
    if (!id) return;
    const channel = supabase
      .channel(`jeepney-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jeepneys",
          filter: `id=eq.${id}`,
        },
        () => fetchJeepney(),
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [id, fetchJeepney]);

  const gpsMarker = markers.find((m) => m.id === id);

  const handleDispatch = async () => {
    if (!jeepney) return;
    setDispatching(true);
    const result = await DispatchService.dispatchJeepney(jeepney.id);
    setDispatching(false);
    setConfirmOpen(false);
    if (result.success) {
      fetchJeepney();
    } else {
      alert(result.error || "Failed to dispatch jeepney. Please try again.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <RNActivityIndicator size="large" color={theme.colors.primary[500]} />
      </SafeAreaView>
    );
  }

  if (error || !jeepney) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center p-5 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
      >
        <Text className="text-red-500 text-center mb-4">
          {error || "Jeepney not found."}
        </Text>
        <TouchableOpacity
          className="bg-sky-500 px-6 py-3 rounded-xl"
          onPress={fetchJeepney}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const occ = occupancyStatus(jeepney.current_occupancy, jeepney.capacity);
  const canDispatch = ["waiting", "loading"].includes(jeepney.status);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}
    >
      {/* Header */}
      <View
        className={`flex-row items-center px-4 py-3 border-b ${
          isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={24} color={isDark ? "#94a3b8" : "#0f172a"} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
          >
            {jeepney.plate_number}
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {jeepney.driver_name || "No driver assigned"}
          </Text>
        </View>
        <StatusPill status={jeepney.status as any} dot isDark={isDark} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Section title="Vehicle">
          <Row label="Jeepney Number" value={jeepney.plate_number} />
          <Row label="Driver" value={jeepney.driver_name || "N/A"} />
          <Row label="Capacity" value={`${jeepney.capacity}`} />
          <Row label="Status" value={jeepney.status.replace("_", " ")} />
        </Section>

        <Section title="Queue">
          <Row
            label="Queue Position"
            value={
              jeepney.queue_position ? `#${jeepney.queue_position}` : "N/A"
            }
          />
          <Row
            label="Loading Started"
            value={
              jeepney.loading_started_at
                ? new Date(jeepney.loading_started_at).toLocaleTimeString()
                : "N/A"
            }
          />
        </Section>

        <Section title="Occupancy">
          <View className="flex-row items-center justify-between mb-2">
            <Text
              className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}
            >
              {jeepney.current_occupancy}/{jeepney.capacity}
            </Text>
            {occ.pct !== undefined && (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: `${occ.color}20`,
                }}
              >
                <Text
                  style={{ color: occ.color, fontWeight: "700", fontSize: 12 }}
                >
                  {occ.label} · {occ.pct}%
                </Text>
              </View>
            )}
          </View>
        </Section>

        <Section title="GPS">
          <Row
            label="Status"
            value={gpsMarker ? "Online" : "No recent GPS data"}
          />
          {gpsMarker && (
            <>
              <Row
                label="Location"
                value={`${gpsMarker.lat.toFixed(5)}, ${gpsMarker.lng.toFixed(5)}`}
              />
              <Row
                label="Speed"
                value={
                  gpsMarker.speed !== undefined
                    ? `${Math.round(gpsMarker.speed)} km/h`
                    : "N/A"
                }
              />
            </>
          )}
        </Section>

        {/* Actions */}
        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity
            className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center gap-2 ${
              canDispatch ? "bg-sky-500" : "bg-slate-300"
            }`}
            disabled={!canDispatch}
            onPress={() => setConfirmOpen(true)}
          >
            <Navigation size={18} color="white" />
            <Text className="text-white font-semibold">Dispatch</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center gap-2 border ${
              isDark ? "border-slate-700" : "border-slate-200"
            }`}
            onPress={() => router.push("/staff/(dispatcher)/chat" as any)}
          >
            <MessageCircle
              size={18}
              color={isDark ? "#e2e8f0" : theme.colors.primary[500]}
            />
            <Text
              className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}
            >
              Staff Chat
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirm modal */}
      {confirmOpen && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
              borderTopLeftRadius: theme.borderRadius.xxl,
              borderTopRightRadius: theme.borderRadius.xxl,
              padding: theme.spacing.lg,
            }}
          >
            <Text
              className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Dispatch {jeepney.plate_number}?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl items-center border ${
                  isDark ? "border-slate-700" : "border-slate-200"
                }`}
                onPress={() => setConfirmOpen(false)}
                disabled={dispatching}
              >
                <Text className={isDark ? "text-slate-300" : "text-slate-700"}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center bg-sky-500"
                onPress={handleDispatch}
                disabled={dispatching}
              >
                {dispatching ? (
                  <RNActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Dispatch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
