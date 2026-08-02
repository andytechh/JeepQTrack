// src/shared/components/ui/JeepneyCard.tsx
import { Clock, MapPin, Users } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { JeepneyQueueItem } from "../../hooks/useJeepneyQueue";
import { StatusPill } from "./StatusPill"; // adjust path if needed

const TERMINAL_ABBR: Record<number, string> = { 1: "Donsol", 2: "Daraga" };

// Map your queue statuses to the ones StatusPill expects
const mapStatusToPill = (
  status: string,
):
  | "active"
  | "completed"
  | "cancelled"
  | "pending"
  | "in_progress"
  | "online"
  | "offline" => {
  switch (status) {
    case "loading":
      return "in_progress";
    case "waiting":
      return "pending";
    default:
      return "pending";
  }
};

export function JeepneyCard({
  item,
  isCurrent,
}: {
  item: JeepneyQueueItem;
  isCurrent?: boolean;
}) {
  const waitMinutes = item.queue_position * 30;

  return (
    <View style={[styles.card, isCurrent && styles.currentCard]}>
      <View style={styles.header}>
        <View style={styles.plateBadge}>
          <Text style={styles.plateBadgeText}>
            {item.plate_number?.slice(0, 3) || "???"}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.plate}>{item.plate_number}</Text>
          <Text style={styles.meta}>
            {item.driver_name || "No driver"} · Bracket {item.bracket}
          </Text>
        </View>

        {/* Use the mapped status, hide the dot for a cleaner look */}
        <StatusPill status={mapStatusToPill(item.status)} dot={false} />
      </View>

      <View style={styles.stats}>
        <Stat
          icon={<Users size={14} color="#64748b" />}
          label={`${item.current_occupancy}/${item.capacity}`}
        />
        <Stat
          icon={<Clock size={14} color="#64748b" />}
          label={
            item.status === "loading"
              ? item.loading_ends_at
                ? `Ends ${new Date(item.loading_ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Loading..."
              : `~${waitMinutes} min`
          }
        />
        <Stat
          icon={<MapPin size={14} color="#64748b" />}
          label={TERMINAL_ABBR[item.terminal_id] ?? "?"}
        />
      </View>
    </View>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  currentCard: {
    borderColor: "#22c55e",
    borderWidth: 2,
    backgroundColor: "#f0fdf4",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  plateBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  plateBadgeText: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  plate: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  meta: { fontSize: 13, color: "#475569", marginTop: 2 },
  stats: { flexDirection: "row", gap: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 13, color: "#475569" },
});
