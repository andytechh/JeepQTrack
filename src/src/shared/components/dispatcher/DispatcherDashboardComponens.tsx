import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock3,
  ListStart,
  MapPin,
  TrendingUp,
  Users,
  X,
} from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ReactNode } from "react";

import type { JeepneyWithOccupancy } from "../../hooks/dispatcher/useDispatcherJeepneys";
import type { TripLog } from "../../hooks/dispatcher/useDispatcherTrips";

// ─────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────

const COLORS = {
  ocean: "#0EA5E9",
  oceanDark: "#0284C7",

  inkDark: "#1E293B",
  ink: "#334155",
  inkMuted: "#64748B",
  inkLight: "#94A3B8",

  clay: "#F1F5F9",
  claySurface: "#F8FAFC",
  clayWhite: "#FFFFFF",

  green: "#22C55E",
  greenDark: "#16A34A",

  amber: "#F59E0B",
  amberDark: "#D97706",

  purple: "#8B5CF6",
  emerald: "#10B981",

  red: "#EF4444",
};

// ─────────────────────────────────────────────────────────────
// CLAY CARD
// ─────────────────────────────────────────────────────────────

export function ClayCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: any;
}) {
  return (
    <View
      className={`rounded-[24px] border border-white/80 bg-clay-surface ${className}`}
      style={[
        {
          shadowColor: "#94A3B8",
          shadowOffset: {
            width: 0,
            height: 6,
          },
          shadowOpacity: 0.13,
          shadowRadius: 12,
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-3 flex-row items-end justify-between">
      <View>
        <Text className="text-[15px] font-extrabold text-ink-dark">
          {title}
        </Text>

        {subtitle ? (
          <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBackground,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBackground: string;
}) {
  return (
    <ClayCard
      style={{
        width: "48%",
        padding: 14,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-[0.7px] text-ink-muted">
            {label}
          </Text>

          <Text className="mt-1 text-[26px] font-extrabold text-ink-dark">
            {value}
          </Text>
        </View>

        <View
          className="h-10 w-10 items-center justify-center rounded-[14px]"
          style={{
            backgroundColor: iconBackground,
          }}
        >
          <Icon size={19} color={iconColor} strokeWidth={2.4} />
        </View>
      </View>

      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <View
          className="h-full rounded-full"
          style={{
            width: "55%",
            backgroundColor: iconColor,
          }}
        />
      </View>
    </ClayCard>
  );
}

// ─────────────────────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────────────────────

function ClayStatusPill({
  status,
  small = false,
}: {
  status: string;
  small?: boolean;
}) {
  const normalized = status.toLowerCase();

  let color = COLORS.inkMuted;
  let background = "#E2E8F0";

  if (["active", "online", "completed", "arrived"].includes(normalized)) {
    color = COLORS.greenDark;
    background = "#DCFCE7";
  } else if (["waiting", "loading", "pending"].includes(normalized)) {
    color = COLORS.amberDark;
    background = "#FEF3C7";
  } else if (["en_route", "dispatched", "in_progress"].includes(normalized)) {
    color = COLORS.oceanDark;
    background = "#E0F2FE";
  } else if (["offline", "inactive", "cancelled"].includes(normalized)) {
    color = COLORS.red;
    background = "#FEE2E2";
  }

  return (
    <View
      className={`flex-row items-center rounded-full ${
        small ? "px-2 py-1" : "px-2.5 py-1.5"
      }`}
      style={{
        backgroundColor: background,
      }}
    >
      <View
        className={`${small ? "h-1.5 w-1.5" : "h-2 w-2"} mr-1.5 rounded-full`}
        style={{
          backgroundColor: color,
        }}
      />

      <Text
        className={`font-bold capitalize ${
          small ? "text-[9px]" : "text-[10px]"
        }`}
        style={{
          color,
        }}
      >
        {status.replace("_", " ")}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// NEXT TO NOTIFY CARD
// ─────────────────────────────────────────────────────────────

export function NextToNotifyCard({
  jeepney,
  onNotify,
  notifying,
}: {
  jeepney: JeepneyWithOccupancy | null;
  onNotify: () => void;
  notifying: boolean;
}) {
  if (!jeepney) {
    return (
      <ClayCard
        style={{
          marginBottom: 20,
          padding: 20,
        }}
      >
        <View className="items-center">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-[16px] bg-slate-100">
            <Bus size={23} color={COLORS.inkLight} strokeWidth={2.3} />
          </View>

          <Text className="text-center text-[13px] font-bold text-ink-muted">
            No jeepneys currently in queue
          </Text>

          <Text className="mt-1 text-center text-[10px] text-ink-light">
            Waiting jeepneys will appear here.
          </Text>
        </View>
      </ClayCard>
    );
  }

  const terminalName = jeepney.terminal_id === 1 ? "Donsol" : "Daraga";

  const occupancy = (jeepney.front_count || 0) + (jeepney.rear_count || 0);

  return (
    <ClayCard
      style={{
        marginBottom: 20,
        padding: 18,
        borderWidth: 1.5,
        borderColor: "#BAE6FD",
      }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-sky-100">
            <ListStart size={18} color={COLORS.oceanDark} strokeWidth={2.5} />
          </View>

          <View className="ml-3">
            <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-sky-600">
              Next to dispatch
            </Text>

            <Text className="mt-0.5 text-[9px] font-medium text-ink-muted">
              Priority queue vehicle
            </Text>
          </View>
        </View>

        <ClayStatusPill status={jeepney.status} />
      </View>

      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-[25px] font-extrabold tracking-tight text-ink-dark">
            {jeepney.plate_number}
          </Text>

          <Text className="mt-0.5 text-[12px] font-medium text-ink-muted">
            {jeepney.driver_name || "No driver assigned"}
          </Text>
        </View>

        <View className="h-12 w-12 items-center justify-center rounded-[16px] bg-sky-50">
          <Bus size={23} color={COLORS.ocean} strokeWidth={2.4} />
        </View>
      </View>

      <View className="mb-4 flex-row rounded-[17px] bg-slate-50 p-3">
        <View className="flex-1">
          <Text className="text-[9px] font-bold uppercase text-ink-light">
            Terminal
          </Text>

          <Text className="mt-1 text-[12px] font-extrabold text-ink-dark">
            {terminalName}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-[9px] font-bold uppercase text-ink-light">
            Queue
          </Text>

          <Text className="mt-1 text-[12px] font-extrabold text-ink-dark">
            #{jeepney.queue_position ?? "N/A"}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-[9px] font-bold uppercase text-ink-light">
            Occupancy
          </Text>

          <Text className="mt-1 text-[12px] font-extrabold text-ink-dark">
            {occupancy}/{jeepney.capacity}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onNotify}
        disabled={notifying}
        className="flex-row items-center justify-center rounded-[17px] bg-amber-500"
        style={{
          minHeight: 50,
          shadowColor: COLORS.amber,
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.22,
          shadowRadius: 8,
          elevation: 3,
          opacity: notifying ? 0.7 : 1,
        }}
      >
        {notifying ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <AlertTriangle size={18} color="#FFFFFF" strokeWidth={2.5} />

            <Text className="ml-2 text-[12px] font-extrabold text-white">
              Notify Driver
            </Text>
          </>
        )}
      </Pressable>
    </ClayCard>
  );
}

// ─────────────────────────────────────────────────────────────
// JEEPNEY LIST ITEM
// ─────────────────────────────────────────────────────────────

export function JeepneyListItem({
  item,
  onPress,
  onAlert,
}: {
  item: JeepneyWithOccupancy;
  onPress: () => void;
  onAlert: (jeepney: JeepneyWithOccupancy) => void;
}) {
  const occupancy = (item.front_count || 0) + (item.rear_count || 0);

  const loadPercent =
    item.capacity > 0
      ? Math.min(100, Math.round((occupancy / item.capacity) * 100))
      : 0;

  const terminalName = item.terminal_id === 1 ? "Donsol" : "Daraga";

  return (
    <ClayCard
      style={{
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <Pressable onPress={onPress}>
        <View className="p-3.5">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-ocean-100">
              <Bus size={18} color={COLORS.ocean} strokeWidth={2.4} />
            </View>

            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <Text className="text-[13px] font-extrabold text-ink-dark">
                  {item.plate_number}
                </Text>

                <View className="ml-2">
                  <ClayStatusPill status={item.status} small />
                </View>
              </View>

              <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
                {item.driver_name || "No driver assigned"}
              </Text>
            </View>

            <Pressable
              onPress={() => onAlert(item)}
              className="h-9 w-9 items-center justify-center rounded-[12px] bg-amber-50"
            >
              <AlertTriangle size={17} color={COLORS.amber} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View className="mt-3 flex-row items-center">
            <MapPin size={12} color={COLORS.inkLight} strokeWidth={2.4} />

            <Text className="ml-1 text-[9px] font-semibold text-ink-muted">
              {terminalName}
            </Text>

            <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />

            <Text className="text-[9px] font-semibold text-ink-muted">
              {occupancy}/{item.capacity} passengers
            </Text>

            <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />

            <Text className="text-[9px] font-semibold text-ink-muted">
              {loadPercent}% full
            </Text>

            {item.queue_position !== null ? (
              <>
                <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />

                <Text className="text-[9px] font-semibold text-ink-muted">
                  #{item.queue_position}
                </Text>
              </>
            ) : null}
          </View>

          <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <View
              className="h-full rounded-full"
              style={{
                width: `${loadPercent}%`,
                backgroundColor:
                  loadPercent >= 90
                    ? COLORS.red
                    : loadPercent >= 70
                      ? COLORS.amber
                      : COLORS.ocean,
              }}
            />
          </View>
        </View>
      </Pressable>
    </ClayCard>
  );
}

// ─────────────────────────────────────────────────────────────
// TRIP LOG ITEM
// ─────────────────────────────────────────────────────────────

export function TripLogItem({ item }: { item: TripLog }) {
  const statusConfig = {
    completed: {
      color: COLORS.greenDark,
      background: "#DCFCE7",
      icon: CheckCircle2,
    },
    in_progress: {
      color: COLORS.oceanDark,
      background: "#E0F2FE",
      icon: TrendingUp,
    },
    cancelled: {
      color: COLORS.red,
      background: "#FEE2E2",
      icon: X,
    },
  };

  const config =
    statusConfig[item.status as keyof typeof statusConfig] ||
    statusConfig.completed;

  const Icon = config.icon;

  return (
    <View className="border-b border-slate-100 px-4 py-3.5">
      <View className="flex-row items-center">
        <View
          className="h-9 w-9 items-center justify-center rounded-[12px]"
          style={{
            backgroundColor: config.background,
          }}
        >
          <Icon size={16} color={config.color} strokeWidth={2.5} />
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-[12px] font-extrabold text-ink-dark">
              {item.jeepney_plate}
            </Text>

            <View
              className="ml-2 rounded-full px-2 py-1"
              style={{
                backgroundColor: config.background,
              }}
            >
              <Text
                className="text-[8px] font-extrabold capitalize"
                style={{
                  color: config.color,
                }}
              >
                {item.status.replace("_", " ")}
              </Text>
            </View>
          </View>

          <Text
            numberOfLines={1}
            className="mt-0.5 text-[10px] font-medium text-ink-muted"
          >
            {item.driver_name} · {item.route}
          </Text>

          <View className="mt-1 flex-row items-center">
            <Clock3 size={10} color={COLORS.inkLight} strokeWidth={2.4} />

            <Text className="ml-1 text-[9px] font-medium text-ink-light">
              {new Date(item.started_at).toLocaleTimeString()}
            </Text>

            <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />

            <Users size={10} color={COLORS.inkLight} strokeWidth={2.4} />

            <Text className="ml-1 text-[9px] font-medium text-ink-light">
              {item.passengers} passengers
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ALERT MODAL
// ─────────────────────────────────────────────────────────────

export function AlertModal({
  visible,
  jeepneys,
  onClose,
  onSendAlert,
}: {
  visible: boolean;
  jeepneys: JeepneyWithOccupancy[];
  onClose: () => void;
  onSendAlert: (jeepneyId: string, message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [alertMessage, setAlertMessage] = useState("");

  const handleSend = () => {
    if (!selectedId || !alertMessage.trim()) {
      return;
    }

    onSendAlert(selectedId, alertMessage.trim());

    setSelectedId(null);
    setAlertMessage("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          onPress={onClose}
          className="absolute inset-0 bg-slate-900/30"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            className="rounded-t-[32px] border border-white/80 bg-clay-background px-5 pb-8 pt-4"
            style={{
              shadowColor: "#64748B",
              shadowOffset: {
                width: 0,
                height: -8,
              },
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 15,
              maxHeight: "88%",
            }}
          >
            <View className="mb-5 items-center">
              <View className="h-1.5 w-12 rounded-full bg-slate-300" />
            </View>

            <View className="mb-5 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-[15px] bg-amber-100">
                  <AlertTriangle
                    size={21}
                    color={COLORS.amberDark}
                    strokeWidth={2.5}
                  />
                </View>

                <View className="ml-3">
                  <Text className="text-[18px] font-extrabold text-ink-dark">
                    Send Alert
                  </Text>

                  <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
                    Notify a jeepney driver
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-clay-surface"
              >
                <X size={19} color={COLORS.inkMuted} strokeWidth={2.5} />
              </Pressable>
            </View>

            <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.8px] text-ink-muted">
              Select Jeepney
            </Text>

            <View className="mb-4 overflow-hidden rounded-[20px] border border-white/80 bg-clay-surface">
              <FlatList
                data={jeepneys}
                keyExtractor={(item) => item.id}
                className="max-h-44"
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const selected = selectedId === item.id;

                  return (
                    <Pressable
                      onPress={() => setSelectedId(item.id)}
                      className="flex-row items-center px-3.5 py-3"
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(148,163,184,0.12)",
                      }}
                    >
                      <View
                        className="h-9 w-9 items-center justify-center rounded-[12px]"
                        style={{
                          backgroundColor: selected ? "#E0F2FE" : "#F1F5F9",
                        }}
                      >
                        <Bus
                          size={16}
                          color={selected ? COLORS.ocean : COLORS.inkMuted}
                          strokeWidth={2.4}
                        />
                      </View>

                      <View className="ml-3 flex-1">
                        <Text className="text-[12px] font-extrabold text-ink-dark">
                          {item.plate_number}
                        </Text>

                        <Text className="mt-0.5 text-[9px] font-medium text-ink-muted">
                          {item.driver_name || "No driver"} · {item.status}
                        </Text>
                      </View>

                      {selected ? (
                        <View className="h-7 w-7 items-center justify-center rounded-full bg-sky-500">
                          <Text className="text-[12px] font-extrabold text-white">
                            ✓
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            </View>

            <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.8px] text-ink-muted">
              Message
            </Text>

            <View
              className="rounded-[19px] border border-white/80 bg-clay-surface px-4 py-3"
              style={{
                shadowColor: "#CBD5E1",
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <TextInput
                className="min-h-[85px] text-[13px] font-medium text-ink-dark"
                placeholder="Write an alert message..."
                placeholderTextColor={COLORS.inkLight}
                value={alertMessage}
                onChangeText={setAlertMessage}
                multiline
                textAlignVertical="top"
              />
            </View>

            <Pressable
              onPress={handleSend}
              disabled={!selectedId || !alertMessage.trim()}
              className="mt-4 flex-row items-center justify-center rounded-[18px]"
              style={{
                minHeight: 52,
                backgroundColor:
                  selectedId && alertMessage.trim() ? COLORS.amber : "#CBD5E1",
                shadowColor:
                  selectedId && alertMessage.trim() ? COLORS.amber : "#94A3B8",
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <AlertTriangle size={18} color="#FFFFFF" strokeWidth={2.5} />

              <Text className="ml-2 text-[12px] font-extrabold text-white">
                Send Alert
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
