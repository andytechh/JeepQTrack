// src/shared/components/map/MapView.tsx
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { JeepneyMarker, useGPSMap } from "../../hooks/useGPSMap";
import MapControls from "./MapControls";
import { getMapHTML } from "./mapHTML";

interface MapViewProps {
  markers: JeepneyMarker[];
  onMarkerPress?: (jeepneyId: string) => void;
  showControls?: boolean;
  enableRealtime?: boolean;
  style?: any;
}

export const MapView: React.FC<MapViewProps> = ({
  markers,
  onMarkerPress,
  showControls = true,
  enableRealtime = true,
  style,
}) => {
  const {
    webViewRef,
    mapReady,
    handleMessage,
    zoomIn,
    zoomOut,
    recenter,
    refreshRoute,
  } = useGPSMap({ markers, enableRealtime, onMarkerPress });

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: getMapHTML() }}
        onMessage={handleMessage}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
      />
      {showControls && (
        <MapControls
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onRecenter={() => {
            const first = markers[0];
            if (first) recenter(first.lat, first.lng);
            else recenter(13.0, 123.65);
          }}
          onShowTerminals={() => recenter(13.0, 123.65)}
          onRefreshRoute={refreshRoute}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: { marginTop: 12, color: "#94a3b8" },
});
