// src/shared/components/map/MapControls.tsx
import { Crosshair, Layers, Minus, Plus } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { lightTheme } from "../../constants/theme";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onShowTerminals: () => void;
  onRefreshRoute?: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onRecenter,
  onShowTerminals,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.zoomGroup}>
        <TouchableOpacity style={styles.button} onPress={onZoomIn}>
          <Plus size={20} color={lightTheme.text.primary} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.button} onPress={onZoomOut}>
          <Minus size={20} color={lightTheme.text.primary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.singleBtn} onPress={onRecenter}>
        <Crosshair size={20} color={lightTheme.text.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.singleBtn} onPress={onShowTerminals}>
        <Layers size={20} color={lightTheme.text.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    top: 16,
    gap: 8,
    zIndex: 10,
  },
  zoomGroup: {
    flexDirection: "column",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: lightTheme.surface,
    borderWidth: 1,
    borderColor: lightTheme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: lightTheme.border,
  },
  singleBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: lightTheme.surface,
    borderWidth: 1,
    borderColor: lightTheme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default MapControls;
