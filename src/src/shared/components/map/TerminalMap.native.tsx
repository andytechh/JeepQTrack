// src/shared/components/map/TerminalMap.native.tsx
//
// OpenStreetMap raster tiles via `UrlTile`. `mapType="none"` is essential:
// it prevents Android from initialising the Google basemap, so this map needs
// NO Google Maps API key and OSM is the only tile source on both platforms.
import { Bus, Crosshair, Layers } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, {
  Circle,
  MapType,
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  UrlTile,
} from "react-native-maps";
import {
  DARAGA_TERMINAL,
  DONSOL_TERMINAL,
  ROUTE_CORRIDOR,
  ROUTE_REGION,
  TERMINALS,
} from "../../constants/terminals";
import { occupancyColor, theme } from "../../constants/theme";
import { useAppTheme } from "../../theme/ThemeProvider";
import type { TerminalMapProps } from "./types";

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export default function TerminalMap({
  jeepneys,
  selectedId,
  onSelect,
  showRoute = true,
  followId,
  height = 320,
  showGeofences = true,
  direction = null,
}: TerminalMapProps) {
  const { colors, isDark } = useAppTheme();
  const mapRef = useRef<MapView>(null);
  const [tilesReady, setTilesReady] = useState(false);

  const visible = useMemo(
    () =>
      jeepneys.filter(
        (j) =>
          j.latitude != null &&
          j.longitude != null &&
          (!direction || !j.direction || j.direction === direction),
      ),
    [jeepneys, direction],
  );

  // Frame the whole corridor on first load.
  useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [DONSOL_TERMINAL, DARAGA_TERMINAL],
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: false },
      );
    }, 350);
    return () => clearTimeout(t);
  }, []);

  // Follow a specific jeepney.
  useEffect(() => {
    if (!followId) return;
    const target = visible.find((j) => j.id === followId);
    if (!target?.latitude || !target?.longitude) return;
    mapRef.current?.animateCamera(
      {
        center: { latitude: target.latitude, longitude: target.longitude },
        zoom: 14,
      },
      { duration: 600 },
    );
  }, [followId, visible]);

  const recenter = () => {
    mapRef.current?.fitToCoordinates([DONSOL_TERMINAL, DARAGA_TERMINAL], {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
    onSelect?.(null);
  };

  return (
    <View style={[styles.wrap, { height: height as number, borderColor: colors.border }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        // "none" => no Google/Apple basemap, OSM tiles only, no API key.
        mapType={"none" as MapType}
        initialRegion={ROUTE_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        onPress={() => onSelect?.(null)}
      >
        <UrlTile
          urlTemplate={OSM_URL}
          maximumZ={19}
          minimumZ={5}
          shouldReplaceMapContent
          tileSize={256}
          onLoad={() => setTilesReady(true)}
        />

        {showRoute && (
          <Polyline
            coordinates={ROUTE_CORRIDOR}
            strokeColor={theme.colors.primary[500]}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {showGeofences &&
          TERMINALS.map((t) => (
            <Circle
              key={`geo-${t.id}`}
              center={{ latitude: t.latitude, longitude: t.longitude }}
              radius={t.radius}
              strokeColor={theme.colors.primary[400]}
              fillColor="rgba(14,165,233,0.16)"
              strokeWidth={2}
            />
          ))}

        {/* Fixed endpoints */}
        {TERMINALS.map((t) => (
          <Marker
            key={t.id}
            coordinate={{ latitude: t.latitude, longitude: t.longitude }}
            title={t.name}
            description="Terminal"
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.terminalPin}>
              <View
                style={[
                  styles.terminalBadge,
                  { backgroundColor: theme.colors.primary[600] },
                ]}
              >
                <Text style={styles.terminalText}>{t.shortName}</Text>
              </View>
              <View
                style={[styles.pinTail, { borderTopColor: theme.colors.primary[600] }]}
              />
            </View>
          </Marker>
        ))}

        {/* Live jeepneys */}
        {visible.map((j) => {
          const color = occupancyColor(j.occupancy, j.capacity);
          const active = selectedId === j.id;
          return (
            <Marker
              key={j.id}
              coordinate={{ latitude: j.latitude!, longitude: j.longitude! }}
              title={j.jeepName || j.plateNumber}
              description={`${j.occupancy}/${j.capacity} seats${
                j.etaMinutes != null ? ` • ${j.etaMinutes} min` : ""
              }`}
              onPress={() => onSelect?.(j.id)}
              rotation={j.heading ?? 0}
              tracksViewChanges={active}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.jeepMarker,
                  {
                    backgroundColor: color,
                    borderColor: active ? "#ffffff" : "rgba(255,255,255,0.75)",
                    transform: [{ scale: active ? 1.22 : 1 }],
                  },
                ]}
              >
                <Bus size={13} color="#ffffff" />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Attribution is required by the OSM tile usage policy. */}
      <View style={[styles.attribution, { backgroundColor: colors.overlay }]}>
        <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.recenter,
          { backgroundColor: colors.surfaceSolid, borderColor: colors.border },
        ]}
        onPress={recenter}
        accessibilityRole="button"
        accessibilityLabel="Recenter map on both terminals"
      >
        <Crosshair size={18} color={colors.text.primary} />
      </TouchableOpacity>

      {!tilesReady && (
        <View style={[styles.loading, { backgroundColor: colors.background }]}>
          <Layers size={22} color={theme.colors.primary[400]} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading map tiles…
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  terminalPin: { alignItems: "center" },
  terminalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
  },
  terminalText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  jeepMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  attribution: {
    position: "absolute",
    bottom: 6,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attributionText: { fontSize: 9, color: "rgba(255,255,255,0.85)" },
  recenter: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: { fontSize: 12, fontWeight: "500" },
});
