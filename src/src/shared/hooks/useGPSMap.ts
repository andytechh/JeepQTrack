// src/shared/hooks/useGPSMap.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { WebView } from "react-native-webview";
import { supabase } from "../config/supabase";

export interface JeepneyMarker {
  id: string;
  lat: number;
  lng: number;
  plateNumber: string;
  status: string;
  occupancy: number;
  capacity: number;
  driverName: string;
  isDriver?: boolean;
  speed?: number;
}

interface UseGPSMapOptions {
  markers: JeepneyMarker[];
  enableRealtime?: boolean;
  onMarkerPress?: (jeepneyId: string) => void;
  onMapReady?: () => void;
}

export function useGPSMap(options: UseGPSMapOptions) {
  const { markers, enableRealtime = true, onMarkerPress, onMapReady } = options;
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef(markers);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Keep ref in sync
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  // ── Message handler from WebView ───────────────────────────
  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        switch (data.type) {
          case "mapReady":
            setMapReady(true);
            onMapReady?.();
            // Send current markers after a tiny delay
            setTimeout(() => {
              webViewRef.current?.postMessage(
                JSON.stringify({
                  type: "updateMarkers",
                  markers: markersRef.current,
                }),
              );
            }, 300);
            break;
          case "markerClicked":
            onMarkerPress?.(data.jeepneyId);
            break;
        }
      } catch (e) {
        console.warn("WebView message parse error:", e);
      }
    },
    [onMarkerPress, onMapReady],
  );

  // ── Send marker updates (debounced) ────────────────────────
  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      webViewRef.current?.postMessage(
        JSON.stringify({ type: "updateMarkers", markers }),
      );
    }, 200);
    return () => clearTimeout(debounceTimer.current);
  }, [markers, mapReady]);

  // ── Realtime GPS subscription ──────────────────────────────
  useEffect(() => {
    if (!enableRealtime) return;
    const channel = supabase
      .channel("gps_realtime_shared")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gps_tracking" },
        (payload) => {
          const newLoc = payload.new;
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "updateJeepney",
              id: newLoc.jeepney_id,
              lat: newLoc.latitude,
              lng: newLoc.longitude,
            }),
          );
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [enableRealtime]);

  // ── Control functions ──────────────────────────────────────
  const zoomIn = useCallback(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "zoomIn" }));
  }, []);

  const zoomOut = useCallback(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "zoomOut" }));
  }, []);

  const recenter = useCallback((lat: number, lng: number) => {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: "centerMap", lat, lng }),
    );
  }, []);

  const refreshRoute = useCallback(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: "refreshRoute" }));
  }, []);

  return {
    webViewRef,
    mapReady,
    handleMessage,
    zoomIn,
    zoomOut,
    recenter,
    refreshRoute,
  };
}
