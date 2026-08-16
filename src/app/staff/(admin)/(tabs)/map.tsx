import {
  CarFront,
  CircleAlert,
  Clock3,
  Gauge,
  MapPin,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react-native";

import React, { useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { MapView } from "@/src/shared/components/map/MapView";

import { colors } from "@/src/shared/constants/theme";

import {
  FleetJeepney,
  useFleetGPS,
} from "../../../../src/shared/hooks/admin/useFleetGPS";

/* ============================================================
   MAP
============================================================ */

const MAP_HEIGHT = 355;

/* ============================================================
   MAIN SCREEN
============================================================ */

export default function FleetMonitoringScreen() {
  const {
    fleet,
    loading,
    refreshing,
    error,
    lastUpdate,
    refresh,

    onlineCount,
    movingCount,
    waitingCount,
    offlineCount,
    passengerCount,
  } = useFleetGPS();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    return fleet.find((item) => item.id === selectedId) ?? null;
  }, [fleet, selectedId]);

  /*
   * Prevent map marker selection from getting lost
   * when realtime GPS updates arrive.
   */
  const selectedIdRef = useRef<string | null>(null);

  /* ==========================================================
     MARKERS
  ========================================================== */

  const mapMarkers = useMemo(() => {
    return fleet
      .filter(
        (item) =>
          item.isOnline &&
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lng) &&
          item.lat !== 0 &&
          item.lng !== 0,
      )
      .map((item) => ({
        id: item.id,

        lat: item.lat,

        lng: item.lng,

        plateNumber: item.plateNumber,

        driverName: item.driverName,

        status: item.status,

        occupancy: item.occupancy,

        capacity: item.capacity,

        speed: item.speed,

        terminalId: item.terminalId,
      }));
  }, [fleet]);

  /* ==========================================================
     MARKER PRESS
  ========================================================== */

  const handleMarkerPress = (jeepneyId: string) => {
    selectedIdRef.current = jeepneyId;

    setSelectedId(jeepneyId);
  };

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

          <Text className="mt-4 text-sm font-extrabold text-slate-700">
            Loading fleet monitoring...
          </Text>

          <Text className="mt-1 text-xs text-slate-400">
            Connecting to live GPS
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
            <View className="flex-row items-center">
              <Text className="text-2xl font-extrabold text-slate-900">
                Fleet Monitoring
              </Text>

              <View className="ml-2 rounded-full bg-emerald-50 px-2 py-1">
                <Text className="text-[9px] font-extrabold text-emerald-600">
                  LIVE
                </Text>
              </View>
            </View>

            <Text className="mt-1 text-sm text-slate-500">
              Monitor jeepneys across the Donsol–Daraga route
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

        {/* CONNECTION STATUS */}

        <View className="mt-3 flex-row items-center self-start rounded-full border border-white bg-white px-3.5 py-2 shadow-clay-sm">
          <View
            className={`mr-2 h-2 w-2 rounded-full ${
              onlineCount > 0 ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />

          <Text className="text-xs font-bold text-slate-600">
            {onlineCount} online
          </Text>

          <View className="mx-2 h-3 w-px bg-slate-200" />

          <Text className="text-xs font-semibold text-slate-400">
            {fleet.length} total
          </Text>
        </View>
      </View>

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <ScrollView
        style={{
          flex: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          paddingBottom: 150,
        }}
      >
        <View className="px-4">
          <View className="flex-row gap-3">
            <FleetStat
              icon={<CarFront size={17} color={colors.primaryDark} />}
              label="Online"
              value={onlineCount}
            />

            <FleetStat
              icon={<Gauge size={17} color={colors.primaryDark} />}
              label="Moving"
              value={movingCount}
            />
          </View>

          <View className="mt-3 flex-row gap-3">
            <FleetStat
              icon={<Clock3 size={17} color={colors.primaryDark} />}
              label="Waiting"
              value={waitingCount}
            />

            <FleetStat
              icon={<Users size={17} color={colors.primaryDark} />}
              label="Passengers"
              value={passengerCount}
            />
          </View>
        </View>

        {/* ====================================================
            MAP
        ==================================================== */}

        <View
          className="mt-4 overflow-hidden rounded-[28px] border border-white bg-white shadow-clay-floating"
          style={{
            height: MAP_HEIGHT,
            marginHorizontal: 16,
          }}
        >
          <MapView
            markers={mapMarkers}
            onMarkerPress={handleMarkerPress}
            showControls={true}
            enableRealtime={true}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
            }}
          />

          {/* MAP STATUS */}

          <View className="absolute bottom-3 left-3 rounded-full border border-white bg-white px-3 py-2 shadow-clay-sm">
            <View className="flex-row items-center">
              <View className="mr-2 h-2 w-2 rounded-full bg-emerald-500" />

              <Text className="text-[10px] font-extrabold text-slate-600">
                {mapMarkers.length} vehicles on map
              </Text>
            </View>
          </View>
        </View>

        {/* ====================================================
            SELECTED JEEPNEY
        ==================================================== */}

        {selected ? (
          <SelectedFleetCard
            jeepney={selected}
            onClose={() => {
              selectedIdRef.current = null;

              setSelectedId(null);
            }}
          />
        ) : (
          <View className="mx-4 mt-4 rounded-[24px] border border-white bg-white p-5 shadow-clay-floating">
            <View className="items-center">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-[17px] bg-ocean-100">
                <MapPin size={23} color={colors.primaryDark} />
              </View>

              <Text className="text-base font-extrabold text-slate-900">
                Select a jeepney
              </Text>

              <Text className="mt-1 max-w-[290px] text-center text-xs leading-5 text-slate-500">
                Tap a vehicle on the map to inspect its live fleet information.
              </Text>
            </View>
          </View>
        )}

        {/* ====================================================
            FLEET LIST
        ==================================================== */}

        <View className="mx-4 mt-4 rounded-[24px] border border-white bg-white p-4 shadow-clay-floating">
          <View className="mb-4 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-[14px] bg-ocean-100">
              <CarFront size={20} color={colors.primaryDark} />
            </View>

            <View className="flex-1">
              <Text className="text-base font-extrabold text-slate-900">
                Fleet
              </Text>

              <Text className="mt-0.5 text-xs text-slate-500">
                Current vehicle status
              </Text>
            </View>

            <View className="rounded-full bg-ocean-50 px-2.5 py-1">
              <Text className="text-[10px] font-extrabold text-ocean-700">
                {fleet.length}
              </Text>
            </View>
          </View>

          {fleet.length === 0 ? (
            <EmptyFleet />
          ) : (
            fleet.map((jeepney) => (
              <FleetListItem
                key={jeepney.id}
                jeepney={jeepney}
                selected={selectedId === jeepney.id}
                onPress={() => handleMarkerPress(jeepney.id)}
              />
            ))
          )}
        </View>

        {/* ====================================================
            LAST UPDATE
        ==================================================== */}

        {lastUpdate && (
          <View className="mt-4 flex-row items-center justify-center">
            <Clock3 size={13} color="#94A3B8" />

            <Text className="ml-1 text-[11px] text-slate-400">
              Last GPS update {new Date(lastUpdate).toLocaleTimeString()}
            </Text>
          </View>
        )}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <View className="mx-4 mt-3 flex-row rounded-[20px] border border-red-100 bg-red-50 p-4">
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
   FLEET STAT
============================================================ */

function FleetStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;

  label: string;

  value: number;
}) {
  return (
    <View className="flex-1 rounded-[20px] bg-white p-3 shadow-clay-sm">
      <View className="mb-2 h-8 w-8 items-center justify-center rounded-[11px] bg-ocean-100">
        {icon}
      </View>

      <Text className="text-xl font-extrabold text-slate-900">{value}</Text>

      <Text className="mt-0.5 text-[10px] font-semibold text-slate-400">
        {label}
      </Text>
    </View>
  );
}

/* ============================================================
   SELECTED FLEET CARD
============================================================ */

function SelectedFleetCard({
  jeepney,
  onClose,
}: {
  jeepney: FleetJeepney;

  onClose: () => void;
}) {
  const occupancy = Math.max(0, jeepney.occupancy);

  const capacity = Math.max(1, jeepney.capacity);

  const occupancyPercent = Math.min(
    100,
    Math.round((occupancy / capacity) * 100),
  );

  const terminal = jeepney.terminalId === 2 ? "Daraga" : "Donsol";

  return (
    <View className="mx-4 mt-4 rounded-[24px] border border-white bg-white p-4 shadow-clay-floating">
      {/* HEADER */}

      <View className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-[17px] bg-ocean-100">
          <CarFront size={24} color={colors.primaryDark} />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-base font-extrabold text-slate-900">
            {jeepney.plateNumber}
          </Text>

          <Text className="mt-0.5 text-xs text-slate-500">
            {jeepney.driverName}
          </Text>
        </View>

        <View
          className={`rounded-full px-3 py-1.5 ${
            jeepney.isOnline ? "bg-emerald-50" : "bg-slate-100"
          }`}
        >
          <Text
            className={`text-[10px] font-extrabold ${
              jeepney.isOnline ? "text-emerald-600" : "text-slate-500"
            }`}
          >
            {jeepney.isOnline ? "LIVE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      {/* LOCATION */}

      <View className="mt-4 flex-row items-center rounded-[16px] bg-ocean-50 p-3">
        <View className="h-8 w-8 items-center justify-center rounded-[11px] bg-ocean-100">
          <MapPin size={16} color={colors.primaryDark} />
        </View>

        <View className="ml-2 flex-1">
          <Text className="text-[9px] font-bold uppercase text-slate-400">
            Terminal
          </Text>

          <Text className="text-sm font-extrabold text-slate-700">
            {terminal}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-[9px] font-bold uppercase text-slate-400">
            STATUS
          </Text>

          <Text className="mt-0.5 text-xs font-extrabold text-ocean-700">
            {formatStatus(jeepney.status)}
          </Text>
        </View>
      </View>

      {/* SPEED + PASSENGERS */}

      <View className="mt-3 flex-row gap-3">
        <DetailBox
          icon={<Gauge size={16} color={colors.primaryDark} />}
          label="Speed"
          value={`${Math.round(jeepney.speed)} km/h`}
        />

        <DetailBox
          icon={<Users size={16} color={colors.primaryDark} />}
          label="Passengers"
          value={`${occupancy}/${capacity}`}
        />
      </View>

      {/* OCCUPANCY */}

      <View className="mt-4">
        <View className="mb-1.5 flex-row justify-between">
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

      {/* GPS */}

      <View className="mt-4 flex-row items-center">
        {jeepney.isOnline ? (
          <Wifi size={14} color="#16A34A" />
        ) : (
          <WifiOff size={14} color="#94A3B8" />
        )}

        <Text className="ml-1.5 flex-1 text-[10px] text-slate-400">
          {jeepney.recordedAt
            ? `GPS ${jeepney.isOnline ? "updated" : "last seen"} ${new Date(
                jeepney.recordedAt,
              ).toLocaleTimeString()}`
            : "No GPS data"}
        </Text>

        <Pressable
          onPress={onClose}
          className="rounded-full bg-slate-100 px-3 py-1.5"
        >
          <Text className="text-[10px] font-bold text-slate-500">Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ============================================================
   DETAIL BOX
============================================================ */

function DetailBox({
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

      <Text className="text-[9px] font-bold uppercase text-slate-400">
        {label}
      </Text>

      <Text className="mt-0.5 text-base font-extrabold text-slate-900">
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
   FLEET LIST ITEM
============================================================ */

function FleetListItem({
  jeepney,
  selected,
  onPress,
}: {
  jeepney: FleetJeepney;

  selected: boolean;

  onPress: () => void;
}) {
  const terminal = jeepney.terminalId === 2 ? "Daraga" : "Donsol";

  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 rounded-[20px] border p-3 ${
        selected
          ? "border-ocean-200 bg-ocean-50"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <View className="flex-row items-center">
        <View
          className={`h-11 w-11 items-center justify-center rounded-[14px] ${
            jeepney.isOnline ? "bg-ocean-100" : "bg-slate-200"
          }`}
        >
          <CarFront
            size={21}
            color={jeepney.isOnline ? colors.primaryDark : "#94A3B8"}
          />
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-sm font-extrabold text-slate-900">
              {jeepney.plateNumber}
            </Text>

            <View
              className={`ml-2 h-2 w-2 rounded-full ${
                jeepney.isOnline ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
          </View>

          <Text numberOfLines={1} className="mt-0.5 text-[11px] text-slate-500">
            {jeepney.driverName}
          </Text>

          <Text className="mt-0.5 text-[10px] font-semibold text-slate-400">
            {terminal} • {formatStatus(jeepney.status)}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-sm font-extrabold text-slate-800">
            {jeepney.occupancy}/{jeepney.capacity}
          </Text>

          <Text className="mt-0.5 text-[9px] font-semibold text-slate-400">
            passengers
          </Text>

          {jeepney.isOnline && (
            <Text className="mt-1 text-[9px] font-bold text-ocean-700">
              {Math.round(jeepney.speed)} km/h
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/* ============================================================
   EMPTY
============================================================ */

function EmptyFleet() {
  return (
    <View className="items-center py-6">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-[17px] bg-slate-100">
        <CarFront size={22} color="#94A3B8" />
      </View>

      <Text className="text-sm font-extrabold text-slate-700">
        No jeepneys found
      </Text>

      <Text className="mt-1 text-center text-xs text-slate-400">
        Fleet vehicles will appear here once they are registered.
      </Text>
    </View>
  );
}

/* ============================================================
   STATUS FORMAT
============================================================ */

function formatStatus(status: string) {
  switch (status) {
    case "en_route":
      return "En Route";

    case "waiting":
      return "Waiting";

    case "loading":
      return "Loading";

    case "arrived":
      return "Arrived";

    case "offline":
      return "Offline";

    default:
      return "Unknown";
  }
}
