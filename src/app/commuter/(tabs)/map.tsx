import {
  CarFront,
  CircleAlert,
  Clock,
  Gauge,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Users,
} from "lucide-react-native";

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { JeepneyETA, MapView } from "@/src/shared/components/map/MapView";

import { colors } from "@/src/shared/constants/theme";

import {
  CommuterJeepneyMarker,
  useCommuterGPS,
} from "@/src/shared/hooks/useCommuterGPS";

/* ============================================================
   TERMINALS
============================================================ */

const TERMINALS = {
  donsOl: {
    id: 1,
    name: "Donsol",
    fullName: "Donsol Terminal",
    lat: 12.9032,
    lng: 123.59425,
  },

  daraga: {
    id: 2,
    name: "Daraga",
    fullName: "Daraga Terminal",
    lat: 13.14769,
    lng: 123.71216,
  },
};

type TerminalId = 1 | 2;

/* ============================================================
   MAP HEIGHT
============================================================ */

const MAP_HEIGHT = 315;

/* ============================================================
   STATUS HELPERS
============================================================ */

/**
 * Determines whether a jeepney should be considered
 * active/online for the commuter map.
 *
 * IMPORTANT:
 * JeepneyMarker does NOT have an isOnline property.
 * The actual field is `status`.
 *
 * DEPARTED is intentionally considered active because
 * the jeepney can still be travelling on the route.
 */
function isInactiveJeepney(status?: string | null): boolean {
  const normalizedStatus = String(status ?? "")
    .trim()
    .toUpperCase();

  return normalizedStatus === "INACTIVE" || normalizedStatus === "OFFLINE";
}

/**
 * Filter the fleet down to jeepneys that should be
 * considered active for the live commuter screen.
 */
function getActiveJeepneys(
  markers: CommuterJeepneyMarker[],
): CommuterJeepneyMarker[] {
  return markers.filter((marker) => !isInactiveJeepney(marker.status));
}

/* ============================================================
   FORMAT
============================================================ */

function formatDistance(km: number) {
  if (!Number.isFinite(km)) {
    return "--";
  }

  if (km < 1) {
    return Math.round(km * 1000) + " m";
  }

  return km.toFixed(1) + " km";
}

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes)) {
    return "--";
  }

  const rounded = Math.max(0, Math.round(minutes));

  if (rounded < 60) {
    return rounded + " min";
  }

  const hours = Math.floor(rounded / 60);

  const mins = rounded % 60;

  if (mins === 0) {
    return hours + " hr";
  }

  return hours + " hr " + mins + " min";
}

/* ============================================================
   MAIN SCREEN
============================================================ */

export default function CommuterMapScreen() {
  const { markers, loading, refreshing, error, lastUpdate, refresh } =
    useCommuterGPS();

  /**
   * ==========================================================
   * ACTIVE JEEPNEYS
   * ==========================================================
   *
   * This is now the single filtered list used throughout
   * this screen.
   *
   * If there are:
   *
   * 3 total
   * 2 active
   * 1 inactive
   *
   * activeMarkers.length === 2
   */
  const activeMarkers = useMemo(() => {
    return getActiveJeepneys(markers);
  }, [markers]);

  const [selected, setSelected] = useState<CommuterJeepneyMarker | null>(null);

  /**
   * Tracks the selected jeepney ID synchronously.
   *
   * This avoids stale React state when WebView ETA messages
   * arrive asynchronously.
   */
  const selectedIdRef = useRef<string | null>(null);

  const [eta, setEta] = useState<JeepneyETA | null>(null);

  /**
   * True once the route resolved through the straight-line
   * fallback rather than the real road route.
   */
  const [routeApproximate, setRouteApproximate] = useState(false);

  /* ==========================================================
     KEEP SELECTED JEEP UPDATED
  ========================================================== */

  useEffect(() => {
    if (!selected) {
      return;
    }

    /**
     * IMPORTANT:
     * Search ACTIVE markers only.
     *
     * If the selected jeepney becomes inactive, it is
     * immediately removed from the selected state.
     */
    const updated = activeMarkers.find((item) => item.id === selected.id);

    if (updated) {
      setSelected(updated);
    } else {
      /**
       * Jeepney became inactive or disappeared.
       */
      setSelected(null);

      selectedIdRef.current = null;

      setEta(null);
    }
  }, [activeMarkers, selected]);

  /* ==========================================================
     STATISTICS
  ========================================================== */

  /**
   * Moving count is based ONLY on active jeepneys.
   */
  const movingCount = useMemo(() => {
    return activeMarkers.filter((item) => Number(item.speed || 0) > 2).length;
  }, [activeMarkers]);

  /**
   * Passenger count is based ONLY on active jeepneys.
   */
  const passengerCount = useMemo(() => {
    return activeMarkers.reduce(
      (total, item) => total + Number(item.occupancy || 0),
      0,
    );
  }, [activeMarkers]);

  /* ==========================================================
     ROUTE STATUS
  ========================================================== */

  const handleRouteStatus = React.useCallback(
    (status: { ready: boolean; approximate?: boolean; error?: string }) => {
      if (status.ready) {
        setRouteApproximate(Boolean(status.approximate));

        if (status.approximate) {
          console.warn(
            "⚠️ Map is using an approximate straight-line route - the real road route could not be loaded.",
          );
        }
      } else if (status.error) {
        console.error("❌ Route error:", status.error);
      }
    },
    [],
  );

  /* ==========================================================
     MARKER PRESS
  ========================================================== */

  const handleMarkerPress = (jeepneyId: string) => {
    /**
     * ONLY search active jeepneys.
     *
     * An inactive jeepney can never become selected.
     */
    const jeepney = activeMarkers.find((item) => item.id === jeepneyId);

    if (!jeepney) {
      console.log("🚫 Ignoring inactive/unknown jeepney:", jeepneyId);

      return;
    }

    console.log("🚐 Selected active jeepney:", jeepney.plateNumber);

    setSelected(jeepney);

    selectedIdRef.current = jeepneyId;

    setEta(null);
  };

  /* ==========================================================
     ETA CALLBACK
  ========================================================== */

  const handleJeepneyETA = React.useCallback(
    (newEta: JeepneyETA) => {
      console.log("🕐 ETA RECEIVED:", newEta);

      /**
       * Only accept ETA for the currently selected
       * active jeepney.
       */
      if (selectedIdRef.current && newEta.jeepneyId === selectedIdRef.current) {
        /**
         * Additional safety check:
         * make sure that jeepney is still active.
         */
        const stillActive = activeMarkers.some(
          (marker) => marker.id === newEta.jeepneyId,
        );

        if (!stillActive) {
          console.log(
            "🚫 Ignoring ETA because jeepney is no longer active:",
            newEta.jeepneyId,
          );

          setSelected(null);

          selectedIdRef.current = null;

          setEta(null);

          return;
        }

        setEta(newEta);
      }
    },
    [activeMarkers],
  );

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-ocean-50">
        <View className="flex-1 items-center justify-center">
          <View className="h-16 w-16 items-center justify-center rounded-[22px] border border-white bg-white shadow-clay-floating">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>

          <Text className="mt-4 text-sm font-bold text-slate-600">
            Loading live jeepney locations...
          </Text>

          <Text className="mt-1 text-xs text-slate-400">
            Connecting to the fleet
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ==========================================================
     MAIN
  ========================================================== */

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-ocean-50">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <View className="px-5 pb-3 pt-2">
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-2xl font-extrabold text-slate-900">
              Live Map
            </Text>

            <Text className="mt-1 text-sm text-slate-500">
              Track jeepneys and plan your trip
            </Text>
          </View>

          <Pressable
            onPress={refresh}
            disabled={refreshing}
            className="ml-3 h-11 w-11 items-center justify-center rounded-[16px] border border-white bg-white shadow-clay-sm"
          >
            <RefreshCw
              size={19}
              color={colors.primaryDark}
              style={{
                opacity: refreshing ? 0.45 : 1,
              }}
            />
          </Pressable>
        </View>

        {/* ====================================================
            ACTIVE JEEPNEY BADGE
        ==================================================== */}

        <View className="mt-3 self-start">
          <View className="flex-row items-center rounded-full border border-white bg-white px-3.5 py-2 shadow-clay-sm">
            <View
              className={`mr-2 h-2 w-2 rounded-full ${
                activeMarkers.length > 0 ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />

            <Text className="text-xs font-bold text-slate-600">
              {activeMarkers.length} jeepney
              {activeMarkers.length !== 1 ? "s" : ""} online
            </Text>
          </View>
        </View>
      </View>

      {/* ======================================================
          MAP
      ====================================================== */}

      <View
        style={{
          height: MAP_HEIGHT,

          marginHorizontal: 16,

          borderRadius: 28,

          overflow: "hidden",

          backgroundColor: "#FFFFFF",

          borderWidth: 1,

          borderColor: "#FFFFFF",

          shadowColor: "#0284C7",

          shadowOffset: {
            width: 0,
            height: 8,
          },

          shadowOpacity: 0.12,

          shadowRadius: 18,

          elevation: 8,
        }}
      >
        <MapView
          /**
           * IMPORTANT:
           * Pass only ACTIVE jeepneys to MapView.
           */
          markers={activeMarkers}
          onMarkerPress={handleMarkerPress}
          onJeepneyETA={handleJeepneyETA}
          onRouteStatus={handleRouteStatus}
          showControls={true}
          enableRealtime={true}
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
          }}
        />
      </View>

      {/* ======================================================
          DETAILS
      ====================================================== */}

      <ScrollView
        style={{
          flex: 1,
          marginTop: 12,
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 150,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ====================================================
            LIVE INFORMATION
        ==================================================== */}

        <View className="rounded-[24px] border border-white bg-white p-4 shadow-clay-floating">
          <View className="mb-4 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-[14px] bg-ocean-100">
              <MapPin size={20} color={colors.primaryDark} />
            </View>

            <View className="flex-1">
              <Text className="text-base font-extrabold text-slate-900">
                Live Information
              </Text>

              <Text className="mt-0.5 text-xs text-slate-500">
                Real-time fleet status
              </Text>
            </View>

            <View className="rounded-full bg-emerald-50 px-2.5 py-1">
              <Text className="text-[9px] font-extrabold text-emerald-600">
                LIVE
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            {/* ==================================================
                ACTIVE
            ================================================== */}

            <InfoCard
              icon={<CarFront size={17} color={colors.primaryDark} />}
              label="Active"
              value={String(activeMarkers.length)}
            />

            {/* ==================================================
                MOVING
            ================================================== */}

            <InfoCard
              icon={<Gauge size={17} color={colors.primaryDark} />}
              label="Moving"
              value={String(movingCount)}
            />

            {/* ==================================================
                PASSENGERS
            ================================================== */}

            <InfoCard
              icon={<Users size={17} color={colors.primaryDark} />}
              label="Passengers"
              value={String(passengerCount)}
            />
          </View>
        </View>

        {/* ====================================================
            SELECTED JEEPNEY
        ==================================================== */}

        <View className="mt-3">
          {selected ? (
            <SelectedJeepney jeepney={selected} />
          ) : (
            <View className="rounded-[24px] border border-white bg-white p-5 shadow-clay-floating">
              <View className="items-center">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-[17px] bg-ocean-100">
                  <MapPin size={23} color={colors.primaryDark} />
                </View>

                <Text className="text-base font-extrabold text-slate-900">
                  Select a jeepney
                </Text>

                <Text className="mt-1 max-w-[280px] text-center text-xs leading-5 text-slate-500">
                  Tap a jeepney on the map to see its live road distance and
                  ETA.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ====================================================
            ETA
        ==================================================== */}

        {selected && <ETASection eta={eta} approximate={routeApproximate} />}

        {/* ====================================================
            LAST UPDATE
        ==================================================== */}

        {lastUpdate && (
          <View className="mt-3 flex-row items-center justify-center">
            <Clock size={13} color="#94A3B8" />

            <Text className="ml-1 text-[11px] text-slate-400">
              Last GPS update {new Date(lastUpdate).toLocaleTimeString()}
            </Text>
          </View>
        )}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <View className="mt-3 flex-row rounded-[20px] border border-red-100 bg-red-50 p-4">
            <CircleAlert size={18} color="#EF4444" />

            <Text className="ml-2 flex-1 text-xs leading-5 text-red-600">
              {error}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ============================================================
   ETA SECTION
============================================================ */

function ETASection({
  eta,
  approximate,
}: {
  eta: JeepneyETA | null;
  approximate?: boolean;
}) {
  if (!eta) {
    return (
      <View className="mt-3 rounded-[24px] border border-white bg-white p-4 shadow-clay-floating">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-[14px] bg-ocean-100">
            <Navigation size={19} color={colors.primaryDark} />
          </View>

          <View className="flex-1">
            <Text className="text-base font-extrabold text-slate-900">
              Calculating ETA...
            </Text>

            <Text className="mt-1 text-xs text-slate-500">
              Finding the jeepney's position on the Donsol–Daraga road.
            </Text>
          </View>

          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View className="mt-3 rounded-[24px] border border-white bg-white p-4 shadow-clay-floating">
      <View className="flex-row items-center">
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-[15px] bg-ocean-100">
          <Navigation size={21} color={colors.primaryDark} />
        </View>

        <View className="flex-1">
          <Text className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            Estimated arrival
          </Text>

          <Text className="mt-0.5 text-2xl font-extrabold text-slate-900">
            {formatDuration(eta.remainingMinutes)}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-[10px] font-bold text-slate-400">ARRIVES</Text>

          <Text className="mt-0.5 text-sm font-extrabold text-ocean-700">
            {eta.estimatedArrivalTime}
          </Text>
        </View>
      </View>

      {/* ======================================================
          DESTINATION
      ====================================================== */}

      <View className="mt-4 rounded-[18px] bg-ocean-50 p-3">
        <View className="flex-row items-center">
          <MapPin size={17} color={colors.primaryDark} />

          <View className="ml-2">
            <Text className="text-[9px] font-bold uppercase text-slate-400">
              Destination
            </Text>

            <Text className="text-sm font-extrabold text-slate-800">
              {eta.destinationName}
            </Text>
          </View>
        </View>
      </View>

      {/* ======================================================
          DISTANCE + SPEED
      ====================================================== */}

      <View className="mt-3 flex-row gap-3">
        <RouteInfo
          icon={<Route size={16} color={colors.primaryDark} />}
          label="Road distance"
          value={formatDistance(eta.remainingDistanceKm)}
        />

        <RouteInfo
          icon={<Gauge size={16} color={colors.primaryDark} />}
          label="Speed"
          value={`${Math.round(eta.currentSpeedKmh)} km/h`}
        />
      </View>

      {/* ======================================================
          TRAVEL + BUFFER
      ====================================================== */}

      <View className="mt-3 flex-row gap-3">
        <RouteInfo
          icon={<Clock size={16} color={colors.primaryDark} />}
          label="Travel time"
          value={formatDuration(eta.travelMinutes)}
        />

        <RouteInfo
          icon={<Clock size={16} color={colors.primaryDark} />}
          label="Added time"
          value={`+${formatDuration(eta.additionalMinutes)}`}
        />
      </View>

      {/* ======================================================
          PROGRESS
      ====================================================== */}

      <View className="mt-4">
        <View className="mb-1.5 flex-row justify-between">
          <Text className="text-[9px] font-bold uppercase text-slate-400">
            Route progress
          </Text>

          <Text className="text-[10px] font-extrabold text-ocean-700">
            {Math.round(eta.progressPercent)}%
          </Text>
        </View>

        <View className="h-2.5 overflow-hidden rounded-full bg-ocean-100">
          <View
            className="h-full rounded-full bg-ocean-500"
            style={{
              width: `${Math.min(100, Math.max(0, eta.progressPercent))}%`,
            }}
          />
        </View>
      </View>

      <Text className="mt-3 text-[9px] leading-4 text-slate-400">
        ETA uses the jeepney's live GPS speed and its remaining distance along
        {approximate
          ? " an approximate straight-line route (the live road route is currently unavailable)"
          : " the actual Donsol–Daraga road route"}
        . A 20-minute allowance is added for stops, loading, and normal delays.
      </Text>
    </View>
  );
}

/* ============================================================
   ROUTE INFO
============================================================ */

function RouteInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-[15px] bg-slate-50 p-3">
      <View className="mb-1">{icon}</View>

      <Text className="text-[9px] font-bold uppercase text-slate-400">
        {label}
      </Text>

      <Text
        numberOfLines={1}
        className="mt-0.5 text-sm font-extrabold text-slate-800"
      >
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
   INFO CARD
============================================================ */

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-[18px] bg-ocean-50 p-3">
      <View className="mb-1">{icon}</View>

      <Text className="text-lg font-extrabold text-slate-900">{value}</Text>

      <Text className="text-[10px] font-semibold text-slate-400">{label}</Text>
    </View>
  );
}

/* ============================================================
   SELECTED JEEPNEY
============================================================ */

function SelectedJeepney({ jeepney }: { jeepney: CommuterJeepneyMarker }) {
  const occupancy = Number(jeepney.occupancy || 0);

  const capacity = Number(jeepney.capacity || 24);

  const occupancyPercent =
    capacity > 0 ? Math.min(100, Math.round((occupancy / capacity) * 100)) : 0;

  const speed = Math.round(Number(jeepney.speed || 0));

  const terminalId = Number(jeepney.terminalId || 1) as TerminalId;

  const terminal = terminalId === 1 ? "Donsol" : "Daraga";

  return (
    <View className="rounded-[24px] border border-white bg-white p-4 shadow-clay-floating">
      <View className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-[17px] bg-ocean-100">
          <CarFront size={24} color={colors.primaryDark} />
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-base font-extrabold text-slate-900"
          >
            {jeepney.plateNumber || "Unknown Jeepney"}
          </Text>

          <Text numberOfLines={1} className="mt-0.5 text-xs text-slate-500">
            {jeepney.driverName || "Unknown driver"}
          </Text>
        </View>

        <View className="rounded-full bg-emerald-50 px-3 py-1.5">
          <Text className="text-[10px] font-extrabold text-emerald-600">
            LIVE
          </Text>
        </View>
      </View>

      {/* ======================================================
          CURRENT SIDE
      ====================================================== */}

      <View className="mt-4 flex-row items-center rounded-[16px] bg-ocean-50 p-3">
        <View className="h-8 w-8 items-center justify-center rounded-[11px] bg-ocean-100">
          <MapPin size={16} color={colors.primaryDark} />
        </View>

        <View className="ml-2">
          <Text className="text-[9px] font-bold uppercase text-slate-400">
            Current side
          </Text>

          <Text className="text-sm font-bold text-slate-700">{terminal}</Text>
        </View>
      </View>

      {/* ======================================================
          SPEED + PASSENGERS
      ====================================================== */}

      <View className="mt-3 flex-row gap-3">
        <View className="flex-1 rounded-[18px] bg-ocean-50 p-3">
          <Text className="text-[10px] font-semibold text-slate-400">
            SPEED
          </Text>

          <Text className="mt-1 text-lg font-extrabold text-slate-900">
            {speed} km/h
          </Text>
        </View>

        <View className="flex-1 rounded-[18px] bg-ocean-50 p-3">
          <Text className="text-[10px] font-semibold text-slate-400">
            PASSENGERS
          </Text>

          <Text className="mt-1 text-lg font-extrabold text-slate-900">
            {occupancy}/{capacity}
          </Text>
        </View>
      </View>

      {/* ======================================================
          OCCUPANCY
      ====================================================== */}

      <View className="mt-4">
        <View className="mb-1.5 flex-row items-center justify-between">
          <Text className="text-[10px] font-bold text-slate-400">
            OCCUPANCY
          </Text>

          <Text className="text-[10px] font-extrabold text-ocean-700">
            {occupancyPercent}%
          </Text>
        </View>

        <View className="h-2.5 overflow-hidden rounded-full bg-ocean-100">
          <View
            className="h-full rounded-full bg-ocean-500"
            style={{
              width: `${occupancyPercent}%`,
            }}
          />
        </View>
      </View>
    </View>
  );
}
