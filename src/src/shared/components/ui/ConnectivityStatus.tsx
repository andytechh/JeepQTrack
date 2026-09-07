import * as Network from "expo-network";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Displays only when the device has no usable internet connection. */
export default function ConnectivityStatus() {
  const insets = useSafeAreaInsets();
  const network = Network.useNetworkState();
  const isOffline =
    network.isConnected === false || network.isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { top: insets.top + 8 }]}>
      <View style={styles.statusDot} />
      <View>
        <Text style={styles.title}>No internet connection</Text>
        <Text style={styles.message}>Trying to reconnect…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF1F2",
    shadowColor: "#450A0A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
  },
  title: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "800",
  },
  message: {
    color: "#B91C1C",
    fontSize: 12,
    marginTop: 1,
  },
});
