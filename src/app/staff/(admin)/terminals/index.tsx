// Replaces your current AdminTerminalsScreen (same route/file). No jeepney assignment anymore.
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crosshair,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import ClayDialog, {
  ClayDialogState,
} from "@/src/shared/components/clay/ClayDialog";
import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { MapView } from "@/src/shared/components/map/MapView";
import { REAL_TERMINALS } from "@/src/shared/constants/terminalDefaults";
import { colors } from "@/src/shared/constants/theme";
import {
  TerminalConfig,
  TerminalId,
  useTerminalSettings,
} from "@/src/shared/hooks/admin/useTerminalSettings";

const RADIUS_STEP = 25;
const RADIUS_MIN = 50;
const RADIUS_MAX = 500;
const TARGET_MINUTES = 5;

type RouteInfo = {
  ready: boolean;
  approximate?: boolean;
  durationMinutes?: number;
  distanceKm?: number;
};

type TerminalSettings = ReturnType<typeof useTerminalSettings>;

/**
 * Waits for the REAL saved terminals before showing the editor, so the built-in defaults can
 * never appear as if they were your saved geofence.
 */
export default function AdminTerminalsScreen() {
  const settings = useTerminalSettings();

  if (!settings.loaded) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1 items-center justify-center px-8">
          {settings.loading ? (
            <>
              <ActivityIndicator color={colors.primaryDark} />
              <Text className="mt-3 text-[13px] font-bold text-ink-dark">
                Loading saved terminals...
              </Text>
            </>
          ) : (
            <>
              <AlertTriangle size={30} color="#B45309" strokeWidth={2.3} />
              <Text className="mt-3 text-center text-[13px] font-extrabold text-ink-dark">
                Couldn't load the saved terminals
              </Text>
              <Text className="mt-1 text-center text-[11px] text-ink-secondary">
                {settings.error ?? "Check your connection and try again."}
              </Text>
              <Pressable
                onPress={settings.refresh}
                className="mt-4 rounded-full bg-ocean-400 px-6 py-3"
              >
                <Text className="text-[11px] font-extrabold text-white">
                  Retry
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.back()}
                className="mt-2 px-6 py-3"
              >
                <Text className="text-[11px] font-bold text-slate-500">
                  Go back
                </Text>
              </Pressable>
            </>
          )}
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return <TerminalsEditor settings={settings} />;
}

function TerminalsEditor({ settings }: { settings: TerminalSettings }) {
  const { terminals, isReal, saving, refresh, save, restoreReal } = settings;

  // Re-read the database every time this screen is opened.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const [drafts, setDrafts] = useState<TerminalConfig[]>(terminals);
  const [pickTarget, setPickTarget] = useState<TerminalId | null>(null);
  const [locatingId, setLocatingId] = useState<TerminalId | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [dialog, setDialog] = useState<ClayDialogState>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mapTouching, setMapTouching] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(drafts) !== JSON.stringify(terminals),
    [drafts, terminals],
  );

  // Follow server changes (first load, realtime, refresh) unless the admin is mid-edit.
  // "Mid-edit" means the draft differs from the LAST SYNCED server values, not the live ones.
  // (Comparing to the live values wrongly blocked the first load: the draft starts as the
  // defaults, so the freshly loaded saved terminals looked like an unsaved edit.)
  const syncedRef = useRef<TerminalConfig[]>(terminals);
  useEffect(() => {
    const midEdit =
      JSON.stringify(drafts) !== JSON.stringify(syncedRef.current);
    if (!midEdit) setDrafts(terminals);
    syncedRef.current = terminals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminals]);

  const update = (id: TerminalId, patch: Partial<TerminalConfig>) => {
    setDrafts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  };

  const showLocationError = (text: string) =>
    setDialog({ kind: "error", title: "Location problem", text });

  /* ---------- actions ---------- */

  const useMyLocation = async (id: TerminalId) => {
    setLocatingId(id);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        showLocationError(
          "Location permission was denied. Allow it in your phone's app settings.",
        );
        return;
      }

      // Master location switch. On Android this offers the "turn on location" dialog.
      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          showLocationError(
            "Location services are off. Turn on Location in your phone's quick settings.",
          );
          return;
        }
      }

      const coords = await getBestPosition();
      if (!coords) {
        showLocationError(
          "No location fix yet. Step near a window or outdoors, make sure Google Location Accuracy is on, then try again.",
        );
        return;
      }

      update(id, { lat: coords.latitude, lng: coords.longitude });
    } catch (e: any) {
      // Show the real reason instead of hiding it.
      showLocationError(
        `Couldn't get your location: ${e?.message ?? String(e)}`,
      );
    } finally {
      setLocatingId(null);
    }
  };

  const handleMapTap = async (lat: number, lng: number) => {
    if (!pickTarget) return;
    const target = pickTarget;
    setPickTarget(null);
    const snapped = await snapToRoad(lat, lng);
    update(target, snapped);
  };

  const doSave = async () => {
    // Save exactly what the database will store, so the draft matches it afterwards.
    const clean = drafts.map((t) => ({
      ...t,
      name: t.name.trim(),
      radius_m: Math.round(t.radius_m),
    }));
    const message = await save(clean);
    if (!message) setDrafts(clean);
    setDialog(
      message
        ? { kind: "error", title: "Couldn't save", text: message }
        : {
            kind: "success",
            title: "Changes saved",
            text: "Devices will pick up the new terminals within a minute.",
          },
    );
  };

  const handleSave = () => {
    if (!isReal) {
      doSave();
      return;
    }
    // Saving while the real terminals are active replaces them for every device.
    setDialog({
      kind: "confirm",
      title: "Replace the real terminals?",
      text: "Devices will follow these new locations within a minute. You can restore the real terminals at any time.",
      confirmLabel: "Save",
      onConfirm: doSave,
    });
  };

  const handleRestoreReal = () => {
    setDialog({
      kind: "confirm",
      title: "Restore real terminals?",
      text: "Devices will go back to the real Donsol and Daraga geofences within a minute.",
      confirmLabel: "Restore",
      onConfirm: async () => {
        setPickTarget(null);
        const message = await restoreReal();
        if (message) {
          setDialog({
            kind: "error",
            title: "Couldn't restore",
            text: message,
          });
        } else {
          setDrafts(REAL_TERMINALS);
          setDialog({
            kind: "success",
            title: "Terminals restored",
            text: "Devices are back on the real Donsol and Daraga geofences.",
          });
        }
      },
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/staff/(admin)/(tabs)");
  };

  /* ---------- derived ---------- */

  const minutes = route?.durationMinutes;
  const routeOk = minutes != null && minutes >= 3 && minutes <= 8;

  return (
    <OceanBackground intensity={0.28}>
      <SafeAreaView className="flex-1">
        <ScrollView
          scrollEnabled={!mapTouching}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primaryDark}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 160,
          }}
        >
          {/* HEADER */}
          <View className="flex-row items-center">
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-white/80"
            >
              <ArrowLeft
                size={19}
                color={colors.primaryDark}
                strokeWidth={2.5}
              />
            </Pressable>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-ocean-700">
                ADMIN
              </Text>
              <Text className="mt-0.5 text-[25px] font-extrabold text-ink-dark">
                {isReal ? "Terminals" : "Terminals · Demo"}
              </Text>
            </View>

            <Pressable
              onPress={handleRefresh}
              disabled={refreshing}
              accessibilityRole="button"
              accessibilityLabel="Refresh"
              className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface shadow-clay-sm"
            >
              <RefreshCw
                size={18}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </Pressable>
          </View>

          <Text className="mt-2 text-[11px] font-medium leading-[17px] text-ink-secondary">
            Set where each terminal is and how large its geofence is. Jeepney
            devices follow these values automatically.
          </Text>

          {/* ACTIVE GEOFENCE STATUS */}
          <View
            className={`mt-5 rounded-[22px] border p-4 ${
              isReal
                ? "border-emerald-100 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <View className="flex-row items-center">
              {isReal ? (
                <CheckCircle2 size={18} color="#059669" strokeWidth={2.4} />
              ) : (
                <AlertTriangle size={18} color="#B45309" strokeWidth={2.4} />
              )}
              <Text
                className={`ml-2 flex-1 text-[12px] font-extrabold ${
                  isReal ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {isReal
                  ? "Devices are using the real terminals"
                  : "Demo geofence active"}
              </Text>
            </View>

            <Text className="mt-1.5 text-[10px] font-semibold leading-[15px] text-ink-secondary">
              {isReal
                ? "Any change you save here replaces the real geofence on every device."
                : "Devices are following your custom locations, not the real Donsol and Daraga terminals."}
            </Text>

            {!isReal && (
              <Pressable
                onPress={handleRestoreReal}
                disabled={saving}
                className="mt-3 flex-row items-center self-start rounded-full bg-amber-400 px-4 py-2.5"
              >
                <RefreshCw size={13} color="#FFFFFF" strokeWidth={2.6} />
                <Text className="ml-1.5 text-[10px] font-extrabold text-white">
                  Restore real terminals
                </Text>
              </Pressable>
            )}
          </View>

          {/* ROUTE SUMMARY */}
          <View className="mt-4 flex-row items-center rounded-[22px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
            <View
              className={`h-[44px] w-[44px] items-center justify-center rounded-[15px] ${
                minutes == null
                  ? "bg-slate-100"
                  : routeOk
                    ? "bg-emerald-100"
                    : "bg-amber-100"
              }`}
            >
              {minutes == null ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : routeOk ? (
                <CheckCircle2 size={22} color="#059669" strokeWidth={2.4} />
              ) : (
                <AlertTriangle size={22} color="#B45309" strokeWidth={2.4} />
              )}
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
                Drive time between terminals
              </Text>
              <Text className="mt-0.5 text-[16px] font-extrabold text-ink-dark">
                {minutes == null
                  ? "Calculating..."
                  : `${minutes.toFixed(1)} min · ${(route?.distanceKm ?? 0).toFixed(1)} km`}
              </Text>
              <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
                {route?.approximate
                  ? "Straight-line estimate (road routing unavailable)"
                  : `Target about ${TARGET_MINUTES} min (car estimate)`}
              </Text>
            </View>
          </View>

          {/* MAP */}
          <View
            className="mt-4 overflow-hidden rounded-[28px] border border-white bg-white shadow-clay-floating"
            style={{ height: 320 }}
          >
            <MapView
              markers={[]}
              terminals={drafts}
              pickMode={pickTarget !== null}
              onMapTap={handleMapTap}
              onTouchActive={setMapTouching}
              onRouteStatus={(s) =>
                setRoute({
                  ready: s.ready,
                  approximate: s.approximate,
                  durationMinutes: s.durationMinutes,
                  distanceKm: s.distanceKm,
                })
              }
              showControls
              enableRealtime={false}
              style={{ flex: 1, width: "100%", height: "100%" }}
            />

            {pickTarget !== null && (
              <View className="absolute left-3 right-16 top-3 flex-row items-center rounded-full border border-white bg-white px-3 py-2 shadow-clay-sm">
                <Crosshair
                  size={14}
                  color={colors.primaryDark}
                  strokeWidth={2.5}
                />
                <Text className="ml-2 flex-1 text-[10px] font-extrabold text-ink-dark">
                  Tap the map to place{" "}
                  {drafts.find((t) => t.id === pickTarget)?.name}
                </Text>
                <Pressable
                  onPress={() => setPickTarget(null)}
                  accessibilityLabel="Cancel picking"
                  className="h-[22px] w-[22px] items-center justify-center rounded-full bg-slate-100"
                >
                  <X size={12} color="#64748B" strokeWidth={2.6} />
                </Pressable>
              </View>
            )}
          </View>

          {/* EDITORS */}
          {drafts.map((t) => (
            <TerminalEditor
              key={t.id}
              terminal={t}
              picking={pickTarget === t.id}
              locating={locatingId === t.id}
              onName={(name) => update(t.id, { name })}
              onRadius={(radius_m) =>
                update(t.id, {
                  radius_m: Math.min(
                    RADIUS_MAX,
                    Math.max(RADIUS_MIN, radius_m),
                  ),
                })
              }
              onUseMyLocation={() => useMyLocation(t.id)}
              onPick={() => setPickTarget(pickTarget === t.id ? null : t.id)}
            />
          ))}
        </ScrollView>

        {/* SAVE BAR */}
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3">
          <View className="flex-row rounded-[26px] border border-white/90 bg-clay-surface p-2 shadow-clay">
            <Pressable
              onPress={() => {
                setDrafts(terminals);
                setPickTarget(null);
              }}
              disabled={!dirty || saving}
              className="items-center justify-center rounded-full px-5"
            >
              <Text
                className={`text-[11px] font-extrabold ${dirty ? "text-slate-600" : "text-slate-300"}`}
              >
                Reset
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={!dirty || saving}
              className={`ml-2 flex-1 flex-row items-center justify-center rounded-full py-3.5 ${
                dirty && !saving ? "bg-ocean-400" : "bg-slate-200"
              }`}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Save size={15} color="#FFFFFF" strokeWidth={2.5} />
                  <Text className="ml-1.5 text-[11px] font-extrabold text-white">
                    {dirty ? "Save changes" : "No changes"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* CLAY DIALOG (confirm / success / error) */}
        <ClayDialog dialog={dialog} onClose={() => setDialog(null)} />
      </SafeAreaView>
    </OceanBackground>
  );
}

/* ================================================================
   TERMINAL EDITOR
================================================================ */

function TerminalEditor({
  terminal,
  picking,
  locating,
  onName,
  onRadius,
  onUseMyLocation,
  onPick,
}: {
  terminal: TerminalConfig;
  picking: boolean;
  locating: boolean;
  onName: (name: string) => void;
  onRadius: (radius: number) => void;
  onUseMyLocation: () => void;
  onPick: () => void;
}) {
  return (
    <View className="mt-5 rounded-[26px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
      <View className="flex-row items-center">
        <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
          <MapPin size={20} color={colors.primaryDark} strokeWidth={2.4} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
            Terminal {terminal.id}
          </Text>
          <TextInput
            value={terminal.name}
            onChangeText={onName}
            placeholder="Terminal name"
            placeholderTextColor="#94A3B8"
            className="mt-0.5 h-[34px] text-[15px] font-extrabold text-ink-dark"
          />
        </View>
      </View>

      <View className="mt-3 rounded-[16px] bg-ocean-50 p-3">
        <Text className="text-[8px] font-bold uppercase text-ink-muted">
          Coordinates
        </Text>
        <Text className="mt-1 text-[12px] font-extrabold text-ink-dark">
          {terminal.lat.toFixed(5)}, {terminal.lng.toFixed(5)}
        </Text>
      </View>

      <View className="mt-3 flex-row">
        <Pressable
          onPress={onUseMyLocation}
          disabled={locating}
          className="flex-1 flex-row items-center justify-center rounded-full bg-ocean-100 py-3"
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <>
              <Navigation
                size={14}
                color={colors.primaryDark}
                strokeWidth={2.5}
              />
              <Text className="ml-1.5 text-[10px] font-extrabold text-ocean-700">
                Use my location
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onPick}
          className={`ml-2 flex-1 flex-row items-center justify-center rounded-full py-3 ${
            picking ? "bg-ocean-400" : "bg-ocean-100"
          }`}
        >
          <Crosshair
            size={14}
            color={picking ? "#FFFFFF" : colors.primaryDark}
            strokeWidth={2.5}
          />
          <Text
            className={`ml-1.5 text-[10px] font-extrabold ${picking ? "text-white" : "text-ocean-700"}`}
          >
            {picking ? "Tap the map..." : "Pick on map"}
          </Text>
        </Pressable>
      </View>

      <View className="mt-4 flex-row items-center">
        <View className="flex-1">
          <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
            Geofence radius
          </Text>
          <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
            100 m or more is most reliable on Android
          </Text>
        </View>

        <Pressable
          onPress={() => onRadius(terminal.radius_m - RADIUS_STEP)}
          accessibilityLabel="Decrease radius"
          className="h-[36px] w-[36px] items-center justify-center rounded-full bg-slate-100"
        >
          <Minus size={16} color="#475569" strokeWidth={2.6} />
        </Pressable>

        <Text className="w-[64px] text-center text-[15px] font-extrabold text-ink-dark">
          {terminal.radius_m} m
        </Text>

        <Pressable
          onPress={() => onRadius(terminal.radius_m + RADIUS_STEP)}
          accessibilityLabel="Increase radius"
          className="h-[36px] w-[36px] items-center justify-center rounded-full bg-slate-100"
        >
          <Plus size={16} color="#475569" strokeWidth={2.6} />
        </Pressable>
      </View>
    </View>
  );
}

/* ================================================================
   LOCATION FIX (tries several ways before giving up)
================================================================ */

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Location request timed out")),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function getBestPosition(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  // 1. Precise fix (GPS), 2. network/balanced fix, 3. last known fix.
  const attempts: Array<() => Promise<Location.LocationObject | null>> = [
    () =>
      withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        15000,
      ),
    () =>
      withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        10000,
      ),
    () => Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }),
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      const pos = await attempt();
      if (pos?.coords) return pos.coords;
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError) throw lastError;
  return null;
}

/* ================================================================
   SNAP TO ROAD (free OSRM "nearest")
================================================================ */

async function snapToRoad(lat: number, lng: number) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(
      `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}`,
      { signal: ctrl.signal },
    );
    clearTimeout(timer);
    const json = await res.json();
    const loc = json?.waypoints?.[0]?.location; // [lng, lat]
    if (Array.isArray(loc) && loc.length === 2) {
      return { lat: loc[1] as number, lng: loc[0] as number };
    }
  } catch {
    // fall through to the raw tap
  }
  return { lat, lng };
}
