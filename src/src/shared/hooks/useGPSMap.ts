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

/**
 * ============================================================
 * MAP ACTIVE STATUS
 * ============================================================
 *
 * These statuses are NOT allowed to appear on the live map.
 *
 * DEPARTED is intentionally NOT included here because a
 * departed jeepney may still be travelling on the route.
 */
function isInactiveJeepney(status?: string | null): boolean {
  const normalizedStatus = String(status ?? "")
    .trim()
    .toUpperCase();

  return normalizedStatus === "INACTIVE" || normalizedStatus === "OFFLINE";
}

/**
 * Returns only jeepneys that should currently be displayed
 * on the live map.
 */
export function getActiveMapMarkers(markers: JeepneyMarker[]): JeepneyMarker[] {
  return markers.filter((marker) => !isInactiveJeepney(marker.status));
}

export function useGPSMap(options: UseGPSMapOptions) {
  const { markers, enableRealtime = true, onMarkerPress, onMapReady } = options;

  const webViewRef = useRef<WebView>(null);

  const [mapReady, setMapReady] = useState(false);

  /**
   * Always keep the latest markers available to realtime
   * callbacks without recreating the Supabase channel.
   */
  const markersRef = useRef<JeepneyMarker[]>(markers);

  const debounceTimer = useRef<NodeJS.Timeout>();

  /**
   * Keep marker ref synchronized.
   */
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  /**
   * ============================================================
   * MESSAGE HANDLER FROM WEBVIEW
   * ============================================================
   */
  const handleMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          /**
           * ----------------------------------------------------
           * MAP READY
           * ----------------------------------------------------
           */
          case "mapReady": {
            setMapReady(true);

            onMapReady?.();

            /**
             * Send only active markers when the map first loads.
             */
            setTimeout(() => {
              const activeMarkers = getActiveMapMarkers(markersRef.current);

              webViewRef.current?.postMessage(
                JSON.stringify({
                  type: "updateMarkers",
                  markers: activeMarkers,
                }),
              );
            }, 300);

            break;
          }

          /**
           * ----------------------------------------------------
           * MARKER CLICKED
           * ----------------------------------------------------
           */
          case "markerClicked": {
            const jeepneyId = data.jeepneyId;

            /**
             * Never allow an inactive jeepney to be selected.
             */
            const jeepney = markersRef.current.find(
              (marker) => marker.id === jeepneyId,
            );

            if (!jeepney) {
              console.log(
                "🚫 Marker click ignored - jeepney not found:",
                jeepneyId,
              );

              break;
            }

            if (isInactiveJeepney(jeepney.status)) {
              console.log(
                "🚫 Marker click ignored - jeepney is inactive:",
                jeepneyId,
                jeepney.status,
              );

              break;
            }

            onMarkerPress?.(jeepneyId);

            break;
          }
        }
      } catch (e) {
        console.warn("WebView message parse error:", e);
      }
    },
    [onMarkerPress, onMapReady],
  );

  /**
   * ============================================================
   * SEND MARKER UPDATES
   * ============================================================
   *
   * IMPORTANT:
   * Never send inactive jeepneys to the WebView.
   */
  useEffect(() => {
    if (!mapReady || !webViewRef.current) {
      return;
    }

    clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const activeMarkers = getActiveMapMarkers(markers);

      webViewRef.current?.postMessage(
        JSON.stringify({
          type: "updateMarkers",
          markers: activeMarkers,
        }),
      );
    }, 200);

    return () => {
      clearTimeout(debounceTimer.current);
    };
  }, [markers, mapReady]);

  /**
   * ============================================================
   * REALTIME GPS SUBSCRIPTION
   * ============================================================
   */
  useEffect(() => {
    if (!enableRealtime) {
      return;
    }

    const channel = supabase
      .channel("gps_realtime_shared")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        (payload) => {
          const newLoc = payload.new;

          const jeepneyId = newLoc.jeepney_id;

          /**
           * Find the jeepney in the current marker list.
           */
          const jeepney = markersRef.current.find(
            (marker) => marker.id === jeepneyId,
          );

          /**
           * If we don't know this jeepney, don't add it to
           * the map through realtime.
           */
          if (!jeepney) {
            console.log(
              "🚫 Ignoring realtime GPS for unknown jeepney:",
              jeepneyId,
            );

            return;
          }

          /**
           * CRITICAL:
           * Do not allow realtime GPS updates for an inactive
           * jeepney to keep it visible on the map.
           */
          if (isInactiveJeepney(jeepney.status)) {
            console.log(
              "🚫 Ignoring realtime GPS for inactive jeepney:",
              jeepney.plateNumber,
              jeepney.status,
            );

            /**
             * Explicitly tell the WebView to remove it if it
             * somehow still exists there.
             */
            webViewRef.current?.postMessage(
              JSON.stringify({
                type: "removeJeepney",
                id: jeepneyId,
              }),
            );

            return;
          }

          /**
           * Active jeepney:
           * send the new GPS position normally.
           */
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: "updateJeepney",
              id: jeepneyId,
              lat: Number(newLoc.latitude),
              lng: Number(newLoc.longitude),
            }),
          );
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [enableRealtime]);

  /**
   * ============================================================
   * CONTROL FUNCTIONS
   * ============================================================
   */

  const zoomIn = useCallback(() => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "zoomIn",
      }),
    );
  }, []);

  const zoomOut = useCallback(() => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "zoomOut",
      }),
    );
  }, []);

  const recenter = useCallback((lat: number, lng: number) => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "centerMap",
        lat,
        lng,
      }),
    );
  }, []);

  const refreshRoute = useCallback(() => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "refreshRoute",
      }),
    );
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
