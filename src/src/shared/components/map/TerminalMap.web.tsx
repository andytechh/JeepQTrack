// src/shared/components/map/TerminalMap.web.tsx
//
// `react-native-maps` has no web implementation, so on web we render a
// schematic corridor map with react-native-svg instead. Positions are a real
// linear projection of the corridor's lat/lng into the viewport, so the route
// shape and every jeepney's placement are geographically faithful — just
// without raster tiles. No API key, no tiles, no network calls.
import { Bus, Crosshair } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, {
  Circle as SvgCircle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import {
  DARAGA_TERMINAL,
  DONSOL_TERMINAL,
  projectOntoRoute,
  ROUTE_CORRIDOR,
} from "../../constants/terminals";
import { occupancyColor, theme } from "../../constants/theme";
import { useAppTheme } from "../../theme/ThemeProvider";
import type { TerminalMapProps } from "./types";

const PAD = 46;

// Corridor bounds, used to normalise lat/lng into the SVG viewport.
const LATS = ROUTE_CORRIDOR.map((p) => p.latitude);
const LNGS = ROUTE_CORRIDOR.map((p) => p.longitude);
const MIN_LAT = Math.min(...LATS);
const MAX_LAT = Math.max(...LATS);
const MIN_LNG = Math.min(...LNGS);
const MAX_LNG = Math.max(...LNGS);

export default function TerminalMap({
  jeepneys,
  selectedId,
  onSelect,
  showRoute = true,
  height = 320,
  showGeofences = true,
  direction = null,
}: TerminalMapProps) {
  const { colors, isDark } = useAppTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height: h } = e.nativeEvent.layout;
    setSize({ width, height: h });
  };

  /** lat/lng → SVG point, preserving the corridor's real orientation. */
  const toXY = (latitude: number, longitude: number) => {
    const w = Math.max(size.width - PAD * 2, 1);
    const h = Math.max(size.height - PAD * 2, 1);
    const nx = (longitude - MIN_LNG) / (MAX_LNG - MIN_LNG || 1);
    const ny = (latitude - MIN_LAT) / (MAX_LAT - MIN_LAT || 1);
    return { x: PAD + nx * w, y: PAD + (1 - ny) * h };
  };

  const routePath = useMemo(() => {
    if (!size.width) return "";
    return ROUTE_CORRIDOR.map((p, i) => {
      const { x, y } = toXY(p.latitude, p.longitude);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  const visible = useMemo(
    () =>
      jeepneys
        .filter(
          (j) =>
            j.latitude != null &&
            j.longitude != null &&
            (!direction || !j.direction || j.direction === direction),
        )
        .map((j) => {
          const proj = projectOntoRoute(j.latitude!, j.longitude!);
          return { ...j, progress: j.progress ?? proj.progress };
        }),
    [jeepneys, direction],
  );

  const donsol = size.width ? toXY(DONSOL_TERMINAL.latitude, DONSOL_TERMINAL.longitude) : null;
  const daraga = size.width ? toXY(DARAGA_TERMINAL.latitude, DARAGA_TERMINAL.longitude) : null;

  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(11,27,50,0.06)";
  const landFrom = isDark ? "#0c1f3a" : "#e9f2fa";
  const landTo = isDark ? "#0a1628" : "#f6fafd";

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.wrap,
        { height: height as number, borderColor: colors.border, backgroundColor: landTo },
      ]}
    >
      {size.width > 0 && (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id="land" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={landFrom} />
              <Stop offset="1" stopColor={landTo} />
            </LinearGradient>
            <LinearGradient id="route" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={theme.colors.primary[500]} />
              <Stop offset="1" stopColor={theme.colors.primary[300]} />
            </LinearGradient>
          </Defs>

          <SvgCircle cx={0} cy={0} r={0} fill="url(#land)" />
          <Path d={`M0,0 H${size.width} V${size.height} H0 Z`} fill="url(#land)" />

          {/* Reference grid to read the map as a spatial plane. */}
          <G>
            {Array.from({ length: 7 }).map((_, i) => {
              const y = (size.height / 6) * i;
              return <Line key={`h${i}`} x1={0} y1={y} x2={size.width} y2={y} stroke={gridColor} strokeWidth={1} />;
            })}
            {Array.from({ length: 7 }).map((_, i) => {
              const x = (size.width / 6) * i;
              return <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={size.height} stroke={gridColor} strokeWidth={1} />;
            })}
          </G>

          {showRoute && routePath !== "" && (
            <>
              {/* Casing under the route for contrast on both themes. */}
              <Path
                d={routePath}
                stroke={isDark ? "rgba(0,0,0,0.45)" : "rgba(11,27,50,0.14)"}
                strokeWidth={11}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={routePath}
                stroke="url(#route)"
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Waypoint ticks */}
              {ROUTE_CORRIDOR.slice(1, -1).map((p, i) => {
                const { x, y } = toXY(p.latitude, p.longitude);
                return (
                  <SvgCircle
                    key={`wp${i}`}
                    cx={x}
                    cy={y}
                    r={2.5}
                    fill={colors.surface}
                    stroke={theme.colors.primary[400]}
                    strokeWidth={1.5}
                  />
                );
              })}
            </>
          )}

          {/* Fixed terminal endpoints */}
          {donsol && daraga &&
            (
              [
                { pt: donsol, t: DONSOL_TERMINAL, anchor: "start" as const },
                { pt: daraga, t: DARAGA_TERMINAL, anchor: "end" as const },
              ]
            ).map(({ pt, t, anchor }) => (
              <G key={t.id}>
                {showGeofences && (
                  <SvgCircle
                    cx={pt.x}
                    cy={pt.y}
                    r={18}
                    fill="rgba(14,165,233,0.16)"
                    stroke={theme.colors.primary[400]}
                    strokeWidth={1.5}
                  />
                )}
                <SvgCircle
                  cx={pt.x}
                  cy={pt.y}
                  r={8}
                  fill={theme.colors.primary[600]}
                  stroke="#ffffff"
                  strokeWidth={2.5}
                />
                <SvgText
                  x={pt.x}
                  y={pt.y - 26}
                  fill={colors.text.primary}
                  fontSize={12}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {t.shortName}
                </SvgText>
              </G>
            ))}

          {/* Live jeepneys */}
          {visible.map((j) => {
            const { x, y } = toXY(j.latitude!, j.longitude!);
            const color = occupancyColor(j.occupancy, j.capacity);
            const active = selectedId === j.id;
            return (
              <G key={j.id}>
                {active && (
                  <SvgCircle cx={x} cy={y} r={17} fill="rgba(14,165,233,0.22)" />
                )}
                <SvgCircle
                  cx={x}
                  cy={y}
                  r={active ? 11 : 9}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                  onPress={() => onSelect?.(j.id)}
                />
              </G>
            );
          })}
        </Svg>
      )}

      {/* Tappable overlays: SVG press targets are small, so give each jeepney
          a proper 44px touch target on top of its dot. */}
      {size.width > 0 &&
        visible.map((j) => {
          const { x, y } = toXY(j.latitude!, j.longitude!);
          return (
            <TouchableOpacity
              key={`hit-${j.id}`}
              style={[styles.hit, { left: x - 22, top: y - 22 }]}
              onPress={() => onSelect?.(selectedId === j.id ? null : j.id)}
              accessibilityRole="button"
              accessibilityLabel={`${j.jeepName || j.plateNumber}, ${j.occupancy} of ${j.capacity} seats taken`}
            />
          );
        })}

      {/* Selected jeepney callout */}
      {selectedId &&
        (() => {
          const j = visible.find((v) => v.id === selectedId);
          if (!j) return null;
          return (
            <View style={[styles.callout, { backgroundColor: colors.surfaceSolid, borderColor: colors.borderStrong }]}>
              <View style={[styles.calloutIcon, { backgroundColor: occupancyColor(j.occupancy, j.capacity) }]}>
                <Bus size={13} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.calloutTitle, { color: colors.text.primary }]} numberOfLines={1}>
                  {j.jeepName || j.plateNumber}
                </Text>
                <Text style={[styles.calloutMeta, { color: colors.text.secondary }]}>
                  {j.occupancy}/{j.capacity} seats
                  {j.etaMinutes != null ? ` • ${j.etaMinutes} min` : ""}
                </Text>
              </View>
            </View>
          );
        })()}

      <View style={[styles.badge, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}>
        <Text style={[styles.badgeText, { color: colors.text.secondary }]}>
          Schematic route view
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.recenter, { backgroundColor: colors.surfaceSolid, borderColor: colors.border }]}
        onPress={() => onSelect?.(null)}
        accessibilityRole="button"
        accessibilityLabel="Clear map selection"
      >
        <Crosshair size={18} color={colors.text.primary} />
      </TouchableOpacity>
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
  hit: { position: "absolute", width: 44, height: 44, borderRadius: 22 },
  callout: {
    position: "absolute",
    left: 12,
    bottom: 12,
    right: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  calloutIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  calloutTitle: { fontSize: 13, fontWeight: "700" },
  calloutMeta: { fontSize: 11, marginTop: 1, fontVariant: ["tabular-nums"] },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "600" },
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
});
