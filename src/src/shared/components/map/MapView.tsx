// src/shared/components/map/MapView.tsx
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import type { TerminalConfig } from "@/src/shared/hooks/admin/useTerminalSettings";

import {
  getActiveMapMarkers,
  JeepneyMarker,
  useGPSMap,
} from "../../hooks/useGPSMap";

import MapControls from "./MapControls";
import { getMapHTML } from "./mapHTML";

export interface JeepneyETA {
  jeepneyId: string;

  currentLat: number;
  currentLng: number;

  destinationName: string;

  progressPercent: number;

  totalRouteDistanceKm: number;

  remainingDistanceKm: number;

  traveledDistanceKm: number;

  currentSpeedKmh: number;

  travelMinutes: number;

  additionalMinutes: number;

  remainingMinutes: number;

  estimatedArrivalTime: string;

  currentTime: string;
}

interface MapViewProps {
  markers: JeepneyMarker[];

  onMarkerPress?: (jeepneyId: string) => void;

  onJeepneyETA?: (eta: JeepneyETA) => void;

  /**
   * Fires once the road route resolves - either from OSRM
   * (approximate: false) or the straight-line fallback
   * (approximate: true).
   */
  onRouteStatus?: (status: {
    ready: boolean;
    approximate?: boolean;
    error?: string;
    durationMinutes?: number;
    distanceKm?: number;
  }) => void;

  /**
   * Terminals (position, name, geofence radius) to draw and route between.
   * When omitted the map keeps the built-in real terminals.
   */
  terminals?: TerminalConfig[];

  /** When true, a tap on the map is reported through onMapTap. */
  pickMode?: boolean;

  onMapTap?: (lat: number, lng: number) => void;

  /**
   * True while a finger is on the map. Use it to freeze a parent ScrollView so
   * pinch-zoom and drag are not stolen by page scrolling:
   *   <ScrollView scrollEnabled={!mapTouching}> ... <MapView onTouchActive={setMapTouching} />
   */
  onTouchActive?: (active: boolean) => void;

  showControls?: boolean;

  enableRealtime?: boolean;

  style?: any;
}

export const MapView: React.FC<MapViewProps> = ({
  markers,
  onMarkerPress,
  onJeepneyETA,
  onRouteStatus,
  terminals,
  pickMode = false,
  onMapTap,
  onTouchActive,
  showControls = true,
  enableRealtime = true,
  style,
}) => {
  /**
   * Build the HTML once. A new { html } object on every render can make the
   * WebView reload, which resets zoom and position.
   */
  const mapSource = React.useMemo(() => ({ html: getMapHTML() }), []);

  /**
   * ============================================================
   * ACTIVE MAP MARKERS
   * ============================================================
   *
   * Only active jeepneys are allowed to reach the map.
   */
  const activeMarkers = React.useMemo(() => {
    return getActiveMapMarkers(markers);
  }, [markers]);

  /**
   * ============================================================
   * GPS MAP
   * ============================================================
   */
  const {
    webViewRef,
    mapReady,
    handleMessage,
    zoomIn,
    zoomOut,
    recenter,
    refreshRoute,
  } = useGPSMap({
    markers: activeMarkers,
    enableRealtime,

    /**
     * Extra safety check before allowing a marker selection.
     */
    onMarkerPress: (jeepneyId) => {
      const jeepney = activeMarkers.find((marker) => marker.id === jeepneyId);

      if (!jeepney) {
        console.log(
          "🚫 Ignoring marker press for inactive/unknown jeepney:",
          jeepneyId,
        );

        return;
      }

      onMarkerPress?.(jeepneyId);
    },
  });

  /**
   * ============================================================
   * TERMINALS / PICK MODE -> WEBVIEW
   * ============================================================
   */
  React.useEffect(() => {
    if (!mapReady || !terminals?.length) return;

    webViewRef.current?.postMessage(
      JSON.stringify({ type: "setTerminals", terminals }),
    );
  }, [mapReady, terminals, webViewRef]);

  React.useEffect(() => {
    if (!mapReady) return;

    webViewRef.current?.postMessage(
      JSON.stringify({ type: "setPickMode", enabled: Boolean(pickMode) }),
    );
  }, [mapReady, pickMode, webViewRef]);

  /**
   * Fit the whole route on screen (no lat/lng => fitBounds in the WebView).
   */
  const fitRoute = React.useCallback(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "recenter" }));
  }, [webViewRef]);

  /**
   * ============================================================
   * WEBVIEW MESSAGE HANDLER
   * ============================================================
   */
  const handleWebViewMessage = React.useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        console.log("🗺️ MAP EVENT:", data.type, data);

        /**
         * ====================================================
         * ROUTE STATUS
         * ====================================================
         */
        if (data.type === "routeReady" && onRouteStatus) {
          onRouteStatus({
            ready: true,
            approximate: Boolean(data.approximate),
            durationMinutes:
              data.durationMinutes != null
                ? Number(data.durationMinutes)
                : undefined,
            distanceKm:
              data.distanceKm != null ? Number(data.distanceKm) : undefined,
          });
        }

        if (data.type === "routeError" && onRouteStatus) {
          onRouteStatus({
            ready: false,
            error: data.message ?? "Unknown route error",
          });
        }

        if (data.type === "mapTouch") {
          onTouchActive?.(Boolean(data.active));
        }

        /**
         * ====================================================
         * MAP TAP (pick mode)
         * ====================================================
         */
        if (data.type === "mapTap") {
          onMapTap?.(Number(data.lat), Number(data.lng));
        }

        /**
         * ====================================================
         * ETA UPDATE
         * ====================================================
         */
        if (data.type === "etaUpdate" && onJeepneyETA) {
          /**
           * Only accept ETA updates for jeepneys that
           * are currently active.
           */
          const jeepney = activeMarkers.find(
            (marker) => marker.id === data.jeepneyId,
          );

          if (!jeepney) {
            console.log(
              "🚫 Ignoring ETA for inactive/unknown jeepney:",
              data.jeepneyId,
            );

            return;
          }

          onJeepneyETA({
            jeepneyId: data.jeepneyId,

            currentLat: Number(data.currentLat),

            currentLng: Number(data.currentLng),

            destinationName: data.destinationName ?? "Destination",

            progressPercent: Number(data.progressPercent ?? 0),

            totalRouteDistanceKm: Number(data.totalRouteDistanceKm ?? 0),

            remainingDistanceKm: Number(data.remainingDistanceKm ?? 0),

            traveledDistanceKm: Number(data.traveledDistanceKm ?? 0),

            currentSpeedKmh: Number(data.currentSpeedKmh ?? 0),

            travelMinutes: Number(data.travelMinutes ?? 0),

            additionalMinutes: Number(data.additionalMinutes ?? 0),

            remainingMinutes: Number(data.remainingMinutes ?? 0),

            estimatedArrivalTime: data.estimatedArrivalTime ?? "--",

            currentTime: data.currentTime ?? new Date().toISOString(),
          });
        }
      } catch (error) {
        console.warn("⚠️ Failed to process map message:", error);
      }

      /**
       * Let useGPSMap process its own events.
       */
      handleMessage(event);
    },
    [
      activeMarkers,
      handleMessage,
      onJeepneyETA,
      onMapTap,
      onRouteStatus,
      onTouchActive,
    ],
  );

  return (
    <View
      style={[styles.container, style]}
      onTouchStart={() => onTouchActive?.(true)}
      onTouchEnd={() => onTouchActive?.(false)}
      onTouchCancel={() => onTouchActive?.(false)}
    >
      <WebView
        ref={webViewRef}
        source={mapSource}
        nestedScrollEnabled={true}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onMessage={handleWebViewMessage}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={["*"]}
        startInLoadingState={true}
        cacheEnabled={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#0EA5E9" />

            <Text style={styles.loadingText}>
              Loading Donsol–Daraga route...
            </Text>
          </View>
        )}
      />

      {showControls && (
        <MapControls
          /**
           * Recenter always works: it follows a jeepney when there is one,
           * otherwise it fits the whole terminal-to-terminal route.
           */
          hasActiveJeepneys={true}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onRecenter={() => {
            const first = activeMarkers[0];

            if (first) {
              recenter(first.lat, first.lng);
            } else {
              fitRoute();
            }
          }}
          onShowTerminals={fitRoute}
          onRefreshRoute={refreshRoute}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 1,
  },

  webview: {
    flex: 1,
    backgroundColor: "#E0F2FE",
  },

  loading: {
    ...StyleSheet.absoluteFill,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "#F0F9FF",
  },

  loadingText: {
    marginTop: 12,

    color: "#64748B",

    fontSize: 13,

    fontWeight: "600",
  },
});
