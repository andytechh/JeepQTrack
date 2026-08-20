import {
  AlertTriangle,
  ArrowRightLeft,
  BusFront,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  Users,
  X,
  XCircle
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { colors } from "@/src/shared/constants/theme";
import {
  TerminalJeepney,
  useAdminTerminals,
} from "@/src/shared/hooks/admin/useAdminTerminal";

type TerminalId = 1 | 2;

const TERMINALS = {
  1: {
    id: 1 as TerminalId,
    name: "Donsol",
    subtitle: "Terminal 1",
  },
  2: {
    id: 2 as TerminalId,
    name: "Daraga",
    subtitle: "Terminal 2",
  },
};

export default function AdminTerminalsScreen() {
  const {
    terminalOneJeepneys,
    terminalTwoJeepneys,
    terminalOne,
    terminalTwo,
    loading,
    refreshing,
    saving,
    error,
    success,
    refresh,
    assignTerminal,
    clearMessages,
  } = useAdminTerminals();

  const [selectedJeepney, setSelectedJeepney] =
    useState<TerminalJeepney | null>(null);

  const [targetTerminal, setTargetTerminal] = useState<TerminalId | null>(null);

  const [search, setSearch] = useState("");

  const [modalType, setModalType] = useState<
    "assign" | "success" | "error" | null
  >(null);

  const filteredTerminalOne = useMemo(() => {
    return filterJeepneys(terminalOneJeepneys, search);
  }, [terminalOneJeepneys, search]);

  const filteredTerminalTwo = useMemo(() => {
    return filterJeepneys(terminalTwoJeepneys, search);
  }, [terminalTwoJeepneys, search]);

  const openAssignModal = (jeepney: TerminalJeepney) => {
    setSelectedJeepney(jeepney);
    setTargetTerminal(jeepney.terminal_id === 1 ? 2 : 1);
    setModalType("assign");
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalType(null);
    setSelectedJeepney(null);
    setTargetTerminal(null);
  };

  const confirmAssignment = async () => {
    if (!selectedJeepney || !targetTerminal) {
      return;
    }

    const result = await assignTerminal(selectedJeepney.id, targetTerminal);

    if (result) {
      setModalType("success");
    } else {
      setModalType("error");
    }
  };

  const closeFeedback = () => {
    clearMessages();
    setModalType(null);
  };

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[25px] border border-white/90 bg-clay-surface shadow-clay">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[15px] font-extrabold text-ink-dark">
              Loading terminals...
            </Text>

            <Text className="mt-1 text-center text-[11px] font-semibold text-ink-muted">
              Getting the latest terminal assignments
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  return (
    <OceanBackground intensity={0.28}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primaryDark}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 140,
          }}
        >
          {/* HEADER */}

          <View className="flex-row items-center">
            <View className="h-[51px] w-[51px] items-center justify-center rounded-[18px] border border-white/90 bg-clay-surface shadow-clay-sm">
              <MapPin size={23} color={colors.primaryDark} strokeWidth={2.4} />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-ocean-700">
                ADMIN
              </Text>

              <Text className="mt-0.5 text-[24px] font-extrabold text-ink-dark">
                Terminals
              </Text>
            </View>

            <Pressable
              onPress={refresh}
              disabled={refreshing}
              className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface"
            >
              <RefreshCw
                size={18}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </Pressable>
          </View>

          <Text className="mt-2 text-[11px] font-medium leading-[17px] text-ink-secondary">
            Assign and manage jeepneys between the Donsol and Daraga terminals.
          </Text>

          {/* SEARCH */}

          <View className="mt-5 flex-row items-center rounded-[19px] border border-white/90 bg-clay-surface px-4">
            <Search size={18} color="#64748B" strokeWidth={2.3} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search jeepney or plate number..."
              placeholderTextColor="#94A3B8"
              className="ml-3 h-[48px] flex-1 text-[12px] font-semibold text-ink-dark"
            />

            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                className="h-[30px] w-[30px] items-center justify-center rounded-full bg-slate-100"
              >
                <X size={14} color="#64748B" strokeWidth={2.5} />
              </Pressable>
            )}
          </View>

          {/* OVERVIEW */}

          <View className="mt-5 flex-row">
            <TerminalSummaryCard
              name="Donsol"
              terminal="Terminal 1"
              total={terminalOne.total}
              active={terminalOne.active}
              icon={<MapPin size={18} color="#0369A1" strokeWidth={2.4} />}
            />

            <View className="ml-3 flex-1">
              <TerminalSummaryCard
                name="Daraga"
                terminal="Terminal 2"
                total={terminalTwo.total}
                active={terminalTwo.active}
                icon={<MapPin size={18} color="#4338CA" strokeWidth={2.4} />}
              />
            </View>
          </View>

          {/* TERMINAL 1 */}

          <TerminalSection
            terminal={TERMINALS[1]}
            jeepneys={filteredTerminalOne}
            total={terminalOne.total}
            active={terminalOne.active}
            inactive={terminalOne.inactive}
            onAssign={openAssignModal}
          />

          {/* TERMINAL 2 */}

          <TerminalSection
            terminal={TERMINALS[2]}
            jeepneys={filteredTerminalTwo}
            total={terminalTwo.total}
            active={terminalTwo.active}
            inactive={terminalTwo.inactive}
            onAssign={openAssignModal}
          />
        </ScrollView>

        <AssignModal
          visible={modalType === "assign"}
          jeepney={selectedJeepney}
          targetTerminal={targetTerminal}
          saving={saving}
          onClose={closeModal}
          onChangeTerminal={setTargetTerminal}
          onConfirm={confirmAssignment}
        />

        <FeedbackModal
          visible={modalType === "success" || modalType === "error"}
          type={modalType === "success" ? "success" : "error"}
          message={
            modalType === "success"
              ? (success ?? "Terminal assignment updated successfully.")
              : (error ?? "Unable to update terminal assignment.")
          }
          onClose={closeFeedback}
        />
      </SafeAreaView>
    </OceanBackground>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function filterJeepneys(jeepneys: TerminalJeepney[], search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return jeepneys;
  }

  return jeepneys.filter((jeepney) => {
    return (
      jeepney.plate_number.toLowerCase().includes(query) ||
      (jeepney.jeep_name ?? "").toLowerCase().includes(query) ||
      (jeepney.driver_name ?? "").toLowerCase().includes(query)
    );
  });
}

function getStatusPresentation(status: TerminalJeepney["status"]) {
  switch (status) {
    case "waiting":
      return {
        label: "Waiting",
        background: "#DBEAFE",
        color: "#0369A1",
      };

    case "loading":
      return {
        label: "Loading",
        background: "#FEF3C7",
        color: "#B45309",
      };

    case "en_route":
      return {
        label: "En Route",
        background: "#E0E7FF",
        color: "#4338CA",
      };

    case "arrived":
      return {
        label: "Arrived",
        background: "#D1FAE5",
        color: "#047857",
      };

    case "dispatched":
      return {
        label: "Dispatched",
        background: "#E0F2FE",
        color: "#0369A1",
      };

    default:
      return {
        label: "Inactive",
        background: "#F1F5F9",
        color: "#64748B",
      };
  }
}

/* ============================================================
   TERMINAL SUMMARY
============================================================ */

function TerminalSummaryCard({
  name,
  terminal,
  total,
  active,
  icon,
}: {
  name: string;
  terminal: string;
  total: number;
  active: number;
  icon: React.ReactNode;
}) {
  return (
    <View className="flex-1 rounded-[24px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
      <View className="h-[40px] w-[40px] items-center justify-center rounded-[14px] bg-ocean-100">
        {icon}
      </View>

      <Text className="mt-3 text-[15px] font-extrabold text-ink-dark">
        {name}
      </Text>

      <Text className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
        {terminal}
      </Text>

      <View className="mt-4 flex-row items-end">
        <Text className="text-[25px] font-extrabold text-ink-dark">
          {total}
        </Text>

        <Text className="mb-1 ml-1 text-[9px] font-bold text-ink-muted">
          jeepneys
        </Text>
      </View>

      <View className="mt-2 flex-row items-center">
        <View className="h-[7px] w-[7px] rounded-full bg-emerald-500" />

        <Text className="ml-1.5 text-[9px] font-bold text-emerald-700">
          {active} active
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   TERMINAL SECTION
============================================================ */

function TerminalSection({
  terminal,
  jeepneys,
  total,
  active,
  inactive,
  onAssign,
}: {
  terminal: {
    id: TerminalId;
    name: string;
    subtitle: string;
  };
  jeepneys: TerminalJeepney[];
  total: number;
  active: number;
  inactive: number;
  onAssign: (jeepney: TerminalJeepney) => void;
}) {
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-end justify-between">
        <View className="flex-1">
          <Text className="text-[17px] font-extrabold text-ink-dark">
            {terminal.name}
          </Text>

          <Text className="mt-0.5 text-[10px] font-semibold text-ink-muted">
            {terminal.subtitle}
          </Text>
        </View>

        <View className="rounded-full bg-ocean-100 px-3 py-1.5">
          <Text className="text-[10px] font-extrabold text-ocean-700">
            {total}
          </Text>
        </View>
      </View>

      <View className="mb-3 flex-row">
        <MiniStat
          label="Active"
          value={active}
          icon={<CheckCircle2 size={14} color="#059669" strokeWidth={2.4} />}
        />

        <View className="ml-2 flex-1">
          <MiniStat
            label="Inactive"
            value={inactive}
            icon={<XCircle size={14} color="#64748B" strokeWidth={2.4} />}
          />
        </View>
      </View>

      {jeepneys.length === 0 ? (
        <EmptyTerminal />
      ) : (
        jeepneys.map((jeepney) => (
          <JeepneyTerminalCard
            key={jeepney.id}
            jeepney={jeepney}
            terminalId={terminal.id}
            onAssign={() => onAssign(jeepney)}
          />
        ))
      )}
    </View>
  );
}

/* ============================================================
   MINI STAT
============================================================ */

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <View className="flex-1 flex-row items-center rounded-[17px] border border-white/90 bg-clay-surface px-3 py-3">
      {icon}

      <View className="ml-2">
        <Text className="text-[9px] font-bold uppercase text-ink-muted">
          {label}
        </Text>

        <Text className="mt-0.5 text-[13px] font-extrabold text-ink-dark">
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   JEEPNEY CARD
============================================================ */

function JeepneyTerminalCard({
  jeepney,
  terminalId,
  onAssign,
}: {
  jeepney: TerminalJeepney;
  terminalId: TerminalId;
  onAssign: () => void;
}) {
  const status = getStatusPresentation(jeepney.status);

  const occupancy = Math.min(
    100,
    Math.round(
      (jeepney.current_occupancy / Math.max(jeepney.capacity, 1)) * 100,
    ),
  );

  const targetTerminal = terminalId === 1 ? "Daraga" : "Donsol";

  return (
    <View className="mb-3 rounded-[25px] border border-white/90 bg-clay-surface p-4 shadow-clay-sm">
      <View className="flex-row items-center">
        <View className="h-[47px] w-[47px] items-center justify-center rounded-[15px] bg-ocean-100">
          <BusFront size={23} color={colors.primaryDark} strokeWidth={2.3} />
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[13px] font-extrabold text-ink-dark"
          >
            {jeepney.jeep_name || jeepney.plate_number || "Unnamed Jeepney"}
          </Text>

          <Text className="mt-0.5 text-[10px] font-semibold text-ink-secondary">
            {jeepney.plate_number || "No plate number"}
          </Text>
        </View>

        <View
          className="rounded-full px-2.5 py-1.5"
          style={{
            backgroundColor: status.background,
          }}
        >
          <Text
            className="text-[8px] font-extrabold uppercase"
            style={{
              color: status.color,
            }}
          >
            {status.label}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row">
        <InfoItem
          icon={<Users size={14} color="#64748B" strokeWidth={2.2} />}
          label="Driver"
          value={jeepney.driver_name || "Unassigned"}
        />

        <InfoItem
          icon={<MapPin size={14} color="#64748B" strokeWidth={2.2} />}
          label="Bracket"
          value={String(jeepney.bracket)}
        />
      </View>

      <View className="mt-3 flex-row">
        <InfoItem
          icon={<Users size={14} color="#64748B" strokeWidth={2.2} />}
          label="Occupancy"
          value={`${jeepney.current_occupancy}/${jeepney.capacity}`}
        />

        <InfoItem
          icon={<Clock3 size={14} color="#64748B" strokeWidth={2.2} />}
          label="Queue"
          value={
            jeepney.queue_position !== null ? `#${jeepney.queue_position}` : "—"
          }
        />
      </View>

      <View className="mt-4">
        <View className="h-[7px] overflow-hidden rounded-full bg-slate-100">
          <View
            className="h-full rounded-full bg-ocean-400"
            style={{
              width: `${occupancy}%`,
            }}
          />
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-[9px] font-semibold text-ink-muted">
            Occupancy
          </Text>

          <Text className="text-[9px] font-extrabold text-ocean-700">
            {occupancy}%
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center">
        <View className="flex-1 flex-row items-center">
          {jeepney.last_gps_at && isToday(jeepney.last_gps_at) ? (
            <>
              <View className="h-[7px] w-[7px] rounded-full bg-emerald-500" />

              <Text className="ml-1.5 text-[9px] font-bold text-emerald-700">
                GPS active today
              </Text>
            </>
          ) : (
            <>
              <View className="h-[7px] w-[7px] rounded-full bg-slate-400" />

              <Text className="ml-1.5 text-[9px] font-bold text-slate-500">
                No GPS today
              </Text>
            </>
          )}
        </View>

        <Pressable
          onPress={onAssign}
          className="flex-row items-center rounded-full bg-ocean-400 px-3.5 py-2.5"
        >
          <ArrowRightLeft size={13} color="#FFFFFF" strokeWidth={2.5} />

          <Text className="ml-1.5 text-[9px] font-extrabold text-white">
            Move to {targetTerminal}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 flex-row items-center">
      <View className="h-[29px] w-[29px] items-center justify-center rounded-[10px] bg-slate-50">
        {icon}
      </View>

      <View className="ml-2 flex-1">
        <Text className="text-[8px] font-bold uppercase tracking-[0.4px] text-ink-muted">
          {label}
        </Text>

        <Text
          numberOfLines={1}
          className="mt-0.5 text-[10px] font-extrabold text-ink-dark"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   EMPTY
============================================================ */

function EmptyTerminal() {
  return (
    <View className="items-center rounded-[25px] border border-white/90 bg-white/70 px-6 py-8">
      <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-ocean-100">
        <BusFront size={24} color={colors.primaryDark} strokeWidth={2.3} />
      </View>

      <Text className="mt-3 text-[14px] font-extrabold text-ink-dark">
        No jeepneys assigned
      </Text>

      <Text className="mt-1 text-center text-[10px] leading-[16px] text-ink-secondary">
        There are currently no jeepneys assigned to this terminal.
      </Text>
    </View>
  );
}

/* ============================================================
   ASSIGN MODAL
============================================================ */

function AssignModal({
  visible,
  jeepney,
  targetTerminal,
  saving,
  onClose,
  onChangeTerminal,
  onConfirm,
}: {
  visible: boolean;
  jeepney: TerminalJeepney | null;
  targetTerminal: TerminalId | null;
  saving: boolean;
  onClose: () => void;
  onChangeTerminal: (terminal: TerminalId) => void;
  onConfirm: () => void;
}) {
  if (!jeepney) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/30 px-5">
        <View className="w-full max-w-[430px] rounded-[30px] border border-white/95 bg-clay-surface p-5 shadow-clay">
          <View className="flex-row items-center">
            <View className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-ocean-100">
              <ArrowRightLeft
                size={22}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[16px] font-extrabold text-ink-dark">
                Assign Terminal
              </Text>

              <Text className="mt-0.5 text-[10px] font-semibold text-ink-muted">
                Change this jeepney's terminal
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              disabled={saving}
              className="h-[34px] w-[34px] items-center justify-center rounded-full bg-white"
            >
              <X size={16} color="#64748B" strokeWidth={2.5} />
            </Pressable>
          </View>

          <View className="mt-5 rounded-[19px] bg-white/80 p-4">
            <Text className="text-[13px] font-extrabold text-ink-dark">
              {jeepney.jeep_name || jeepney.plate_number}
            </Text>

            <Text className="mt-1 text-[10px] font-semibold text-ink-secondary">
              {jeepney.plate_number}
            </Text>

            <View className="mt-3 flex-row">
              <View className="flex-1">
                <Text className="text-[8px] font-bold uppercase text-ink-muted">
                  Current terminal
                </Text>

                <Text className="mt-1 text-[11px] font-extrabold text-ink-dark">
                  {jeepney.terminal_id === 1 ? "Donsol" : "Daraga"}
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-[8px] font-bold uppercase text-ink-muted">
                  Bracket
                </Text>

                <Text className="mt-1 text-[11px] font-extrabold text-ink-dark">
                  {jeepney.bracket}
                </Text>
              </View>
            </View>
          </View>

          <Text className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.6px] text-ink-muted">
            Select terminal
          </Text>

          <TerminalOption
            name="Donsol"
            subtitle="Terminal 1"
            selected={targetTerminal === 1}
            disabled={jeepney.terminal_id === 1}
            onPress={() => onChangeTerminal(1)}
          />

          <TerminalOption
            name="Daraga"
            subtitle="Terminal 2"
            selected={targetTerminal === 2}
            disabled={jeepney.terminal_id === 2}
            onPress={() => onChangeTerminal(2)}
          />

          <View className="mt-5 flex-row">
            <Pressable
              onPress={onClose}
              disabled={saving}
              className="flex-1 items-center justify-center rounded-full bg-white py-3.5"
            >
              <Text className="text-[11px] font-extrabold text-slate-600">
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={
                saving ||
                !targetTerminal ||
                targetTerminal === jeepney.terminal_id
              }
              className={`ml-2 flex-1 flex-row items-center justify-center rounded-full py-3.5 ${
                saving ||
                !targetTerminal ||
                targetTerminal === jeepney.terminal_id
                  ? "bg-slate-200"
                  : "bg-ocean-400"
              }`}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.5} />

                  <Text className="ml-1.5 text-[11px] font-extrabold text-white">
                    Confirm
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================
   TERMINAL OPTION
============================================================ */

function TerminalOption({
  name,
  subtitle,
  selected,
  disabled,
  onPress,
}: {
  name: string;
  subtitle: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`mt-2 flex-row items-center rounded-[19px] border p-4 ${
        selected
          ? "border-ocean-300 bg-ocean-50"
          : "border-white/90 bg-white/70"
      }`}
    >
      <View
        className={`h-[38px] w-[38px] items-center justify-center rounded-[13px] ${
          selected ? "bg-ocean-100" : "bg-slate-100"
        }`}
      >
        <MapPin
          size={18}
          color={selected ? colors.primaryDark : "#64748B"}
          strokeWidth={2.3}
        />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[12px] font-extrabold text-ink-dark">{name}</Text>

        <Text className="mt-0.5 text-[9px] font-semibold text-ink-muted">
          {subtitle}
        </Text>
      </View>

      {disabled ? (
        <View className="rounded-full bg-slate-100 px-2.5 py-1.5">
          <Text className="text-[8px] font-extrabold text-slate-500">
            CURRENT
          </Text>
        </View>
      ) : selected ? (
        <CheckCircle2 size={20} color={colors.primaryDark} strokeWidth={2.5} />
      ) : (
        <View className="h-[20px] w-[20px] rounded-full border-2 border-slate-200" />
      )}
    </Pressable>
  );
}

/* ============================================================
   FEEDBACK MODAL
============================================================ */

function FeedbackModal({
  visible,
  type,
  message,
  onClose,
}: {
  visible: boolean;
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  const successMode = type === "success";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/30 px-5">
        <View className="w-full max-w-[410px] rounded-[30px] border border-white/95 bg-clay-surface p-6 shadow-clay">
          <View className="items-center">
            <View
              className={`h-[68px] w-[68px] items-center justify-center rounded-[23px] ${
                successMode ? "bg-emerald-100" : "bg-red-50"
              }`}
            >
              {successMode ? (
                <CheckCircle2 size={34} color="#059669" strokeWidth={2.3} />
              ) : (
                <AlertTriangle size={34} color="#DC2626" strokeWidth={2.3} />
              )}
            </View>

            <Text className="mt-4 text-[17px] font-extrabold text-ink-dark">
              {successMode ? "Assignment Updated" : "Assignment Failed"}
            </Text>

            <Text className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary">
              {message}
            </Text>

            <Pressable
              onPress={onClose}
              className={`mt-5 w-full items-center justify-center rounded-full py-3.5 ${
                successMode ? "bg-ocean-400" : "bg-slate-700"
              }`}
            >
              <Text className="text-[11px] font-extrabold text-white">
                {successMode ? "Done" : "Close"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================
   DATE HELPER
============================================================ */

function isToday(dateString: string | null) {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
