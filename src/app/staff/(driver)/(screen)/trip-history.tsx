import { Clock, Navigation, Users } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

// ─── TYPES ──────────────────────────────────────────────────────────
interface Trip {
  id: string;
  route?: string;
  origin_terminal?: string;
  destination_terminal?: string;
  passenger_count?: number;
  total_passengers?: number;
  status: string;
  departure_time?: string;
  started_at?: string;
  completed_at?: string;
  arrival_time?: string;
}

interface TripHistoryProps {
  trips: Trip[];
  showAll: boolean;
  onToggleShowAll: () => void;
  maxPreview?: number;
}

// ─── HELPERS ────────────────────────────────────────────────────────
const formatDuration = (start?: string, end?: string) => {
  if (!start || !end) return "N/A";
  const d = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
  return d < 60 ? `${d}m` : `${Math.floor(d / 60)}h ${d % 60}m`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// ─── COMPONENT ──────────────────────────────────────────────────────
export const TripHistory: React.FC<TripHistoryProps> = ({
  trips,
  showAll,
  onToggleShowAll,
  maxPreview = 3,
}) => {
  if (!trips || trips.length === 0) return null;

  const displayedTrips = showAll ? trips : trips.slice(0, maxPreview);

  return (
    <View className="bg-white/[0.04] border border-white/[0.07] rounded-[20px] p-4 mb-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3.5">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#0ea5e9" />
          <Text className="text-white text-sm font-bold">Trip History</Text>
        </View>
        {trips.length > maxPreview && (
          <TouchableOpacity onPress={onToggleShowAll}>
            <Text className="text-sky-400 text-[11px] font-semibold">
              {showAll ? "Show Less" : `View All (${trips.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Trip List */}
      {displayedTrips.map((trip, index) => {
        const passengers = trip.total_passengers || trip.passenger_count || 0;
        const fare = passengers * 15;
        const statusColor = trip.status === "completed" ? "#22c55e" : "#f59e0b";

        return (
          <View key={trip.id}>
            <View className="flex-row justify-between items-center py-2">
              {/* Left - Route & Details */}
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Navigation size={12} color="#0ea5e9" />
                  <Text
                    className="text-white text-[13px] font-semibold"
                    numberOfLines={1}
                  >
                    {trip.route ||
                      `${trip.origin_terminal || "Terminal"} → ${trip.destination_terminal || "Terminal"}`}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3 mt-1 ml-5">
                  <View className="flex-row items-center gap-1">
                    <Users size={10} color="#94a3b8" />
                    <Text className="text-white/40 text-[10px]">
                      {passengers}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Clock size={10} color="#94a3b8" />
                    <Text className="text-white/40 text-[10px]">
                      {formatDuration(
                        trip.departure_time || trip.started_at,
                        trip.arrival_time || trip.completed_at,
                      )}
                    </Text>
                  </View>
                  {trip.status === "completed" && (
                    <Text className="text-green-400 text-[10px] font-bold">
                      ₱{fare}
                    </Text>
                  )}
                </View>
              </View>

              {/* Right - Status & Date */}
              <View className="items-end ml-2">
                <View
                  className="rounded-lg px-2 py-0.5"
                  style={{ backgroundColor: `${statusColor}20` }}
                >
                  <Text
                    className="text-[10px] font-semibold capitalize"
                    style={{ color: statusColor }}
                  >
                    {trip.status?.replace("_", " ") || "completed"}
                  </Text>
                </View>
                <Text className="text-white/30 text-[9px] mt-1">
                  {formatDate(
                    trip.arrival_time ||
                      trip.completed_at ||
                      trip.departure_time,
                  )}
                </Text>
              </View>
            </View>

            {/* Divider */}
            {index < displayedTrips.length - 1 && (
              <View className="h-px bg-white/5" />
            )}
          </View>
        );
      })}
    </View>
  );
};
