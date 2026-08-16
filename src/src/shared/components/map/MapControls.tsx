import { Crosshair, Layers, Minus, Plus } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onShowTerminals: () => void;
  onRefreshRoute?: () => void;
}

const CLAY = {
  background: "#F8FCFF",
  surface: "#FFFFFF",
  surfaceSoft: "#F0F9FF",

  ocean50: "#F0F9FF",
  ocean100: "#E0F2FE",
  ocean200: "#BAE6FD",
  ocean300: "#7DD3FC",
  ocean400: "#38BDF8",
  ocean500: "#0EA5E9",
  ocean600: "#0284C7",
  ocean700: "#0369A1",

  text: "#0F172A",
  textSecondary: "#475569",
  border: "#D7EEF9",

  white: "#FFFFFF",
};

const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onRecenter,
  onShowTerminals,
}) => {
  return (
    <View style={styles.container}>
      {/* ======================================================
          ZOOM CONTROL
          ====================================================== */}
      <View style={styles.zoomGroup}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.button}
          onPress={onZoomIn}
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
        >
          <Plus size={20} color={CLAY.ocean700} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.button}
          onPress={onZoomOut}
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
        >
          <Minus size={20} color={CLAY.ocean700} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* ======================================================
          RECENTER
          ====================================================== */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.singleBtn}
        onPress={onRecenter}
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
      >
        <Crosshair size={20} color={CLAY.ocean700} strokeWidth={2.3} />
      </TouchableOpacity>

      {/* ======================================================
          TERMINALS
          ====================================================== */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.singleBtn}
        onPress={onShowTerminals}
        accessibilityRole="button"
        accessibilityLabel="Show terminals"
      >
        <Layers size={20} color={CLAY.ocean700} strokeWidth={2.3} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  /*
   * ==========================================================
   * MAIN CONTROL CONTAINER
   * ==========================================================
   */
  container: {
    position: "absolute",
    right: 16,
    top: 16,

    gap: 10,

    zIndex: 10,
  },

  /*
   * ==========================================================
   * ZOOM GROUP
   *
   * Soft white clay surface with:
   * - subtle blue border
   * - soft shadow
   * - rounded corners
   * ==========================================================
   */
  zoomGroup: {
    flexDirection: "column",

    width: 46,

    borderRadius: 16,

    overflow: "hidden",

    backgroundColor: CLAY.surface,

    borderWidth: 1,
    borderColor: CLAY.border,

    shadowColor: CLAY.ocean600,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,

    elevation: 5,
  },

  /*
   * ==========================================================
   * ZOOM BUTTON
   * ==========================================================
   */
  button: {
    width: 46,
    height: 46,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: CLAY.surface,
  },

  /*
   * ==========================================================
   * DIVIDER
   * ==========================================================
   */
  divider: {
    height: 1,

    marginHorizontal: 9,

    backgroundColor: CLAY.ocean100,
  },

  /*
   * ==========================================================
   * SINGLE CLAY BUTTON
   * ==========================================================
   */
  singleBtn: {
    width: 46,
    height: 46,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: CLAY.surface,

    borderWidth: 1,
    borderColor: CLAY.border,

    shadowColor: CLAY.ocean600,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,

    elevation: 5,
  },
});

export default MapControls;
