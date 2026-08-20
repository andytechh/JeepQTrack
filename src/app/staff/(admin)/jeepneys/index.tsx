import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  AdminJeepneyRecord,
  AvailableDriver,
  useAdminJeepneys,
} from "@/src/shared/hooks/admin/useAdminJeepney";

type Filter =
  "all" | "active" | "waiting" | "loading" | "en_route" | "inactive";

const FILTERS: {
  label: string;
  value: Filter;
}[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Waiting", value: "waiting" },
  { label: "Loading", value: "loading" },
  { label: "En Route", value: "en_route" },
  { label: "Inactive", value: "inactive" },
];

export default function AdminJeepneysScreen() {
  const router = useRouter();

  const {
    jeepneys,
    availableDrivers,
    loading,
    refreshing,
    driversLoading,
    error,
    driversError,
    refresh,
    addJeepney,
  } = useAdminJeepneys();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [addVisible, setAddVisible] = useState(false);

  const [plateNumber, setPlateNumber] = useState("");

  const [jeepName, setJeepName] = useState("");

  const [bracket, setBracket] = useState("");

  const [capacity, setCapacity] = useState("24");

  const [selectedDriver, setSelectedDriver] = useState<AvailableDriver | null>(
    null,
  );

  const [driverPickerOpen, setDriverPickerOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const [modalError, setModalError] = useState<string | null>(null);

  const [successVisible, setSuccessVisible] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const filteredJeepneys = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jeepneys.filter((jeepney) => {
      const matchesSearch =
        !query ||
        jeepney.plate_number.toLowerCase().includes(query) ||
        jeepney.jeep_name?.toLowerCase().includes(query) ||
        jeepney.driver_name?.toLowerCase().includes(query) ||
        jeepney.terminal_name?.toLowerCase().includes(query);

      let matchesFilter = true;

      if (filter === "active") {
        matchesFilter = jeepney.status !== "inactive";
      } else if (filter === "inactive") {
        matchesFilter = jeepney.status === "inactive";
      } else if (filter !== "all") {
        matchesFilter = jeepney.status === filter;
      }

      return Boolean(matchesSearch) && matchesFilter;
    });
  }, [jeepneys, search, filter]);

  const resetForm = () => {
    setPlateNumber("");
    setJeepName("");
    setBracket("");
    setCapacity("24");
    setSelectedDriver(null);
    setDriverPickerOpen(false);
    setModalError(null);
  };

  const closeAddModal = () => {
    if (saving) {
      return;
    }

    setAddVisible(false);
    resetForm();
  };

  const handleAddJeepney = async () => {
    if (saving) {
      return;
    }

    try {
      setModalError(null);

      const parsedBracket = Number(bracket.trim());

      const parsedCapacity = Number(capacity.trim());

      if (!plateNumber.trim()) {
        setModalError("Plate number is required.");
        return;
      }

      if (!Number.isInteger(parsedBracket) || parsedBracket <= 0) {
        setModalError("Enter a valid bracket number.");
        return;
      }

      if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
        setModalError("Enter a valid maximum capacity.");
        return;
      }

      setSaving(true);

      await addJeepney({
        plate_number: plateNumber.trim(),

        jeep_name: jeepName.trim() || null,

        bracket: parsedBracket,

        capacity: parsedCapacity,

        driver_id: selectedDriver?.id ?? null,
      });

      setAddVisible(false);

      resetForm();

      setSuccessMessage(
        "The jeepney has been added to the fleet successfully.",
      );

      setSuccessVisible(true);
    } catch (err: any) {
      setModalError(err?.message ?? "Unable to add the jeepney.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/staff/(admin)");
  };

  if (loading) {
    return (
      <OceanBackground intensity={0.25}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface">
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
              Loading jeepneys...
            </Text>

            <Text className="mt-1 text-center text-[11px] text-ink-muted">
              Getting the latest fleet information
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
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primaryDark}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 160,
          }}
        >
          <View className="flex-row items-center">
            <Pressable
              onPress={handleBack}
              className="h-[50px] w-[50px] items-center justify-center rounded-[18px] border border-white/90 bg-clay-surface"
            >
              <ArrowLeft
                size={22}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </Pressable>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-ocean-700">
                MANAGEMENT
              </Text>

              <Text className="mt-0.5 text-[25px] font-extrabold text-ink-dark">
                Jeepneys
              </Text>
            </View>

            <View className="flex-row items-center">
              <View className="rounded-full bg-ocean-100 px-3 py-2">
                <Text className="text-[11px] font-extrabold text-ocean-700">
                  {jeepneys.length}
                </Text>
              </View>

              <Pressable
                onPress={() => setAddVisible(true)}
                className="ml-2 h-[42px] w-[42px] items-center justify-center rounded-full bg-ocean-400"
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={2.7} />
              </Pressable>
            </View>
          </View>

          <View className="mt-5 flex-row items-center rounded-[20px] border border-white/90 bg-clay-surface px-4">
            <Search size={18} color="#64748B" strokeWidth={2.2} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search jeepney, plate, driver, or terminal"
              placeholderTextColor="#94A3B8"
              className="ml-3 flex-1 py-4 text-[12px] font-medium text-ink-dark"
            />

            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <XCircle size={18} color="#94A3B8" strokeWidth={2.2} />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerStyle={{
              paddingRight: 10,
            }}
          >
            {FILTERS.map((item) => {
              const selected = filter === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  className={`mr-2 rounded-full px-4 py-2.5 ${
                    selected ? "bg-ocean-400" : "bg-white/80"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-extrabold ${
                      selected ? "text-white" : "text-ink-secondary"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error && (
            <View className="mt-5 rounded-[24px] border border-red-100 bg-white/90 p-5">
              <View className="flex-row items-center">
                <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-red-50">
                  <AlertTriangle size={21} color="#DC2626" strokeWidth={2.4} />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-extrabold text-ink-dark">
                    Fleet unavailable
                  </Text>

                  <Text className="mt-1 text-[11px] leading-[17px] text-ink-secondary">
                    {error}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={refresh}
                className="mt-4 h-[44px] flex-row items-center justify-center rounded-full bg-ocean-400"
              >
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />

                <Text className="ml-2 text-[12px] font-extrabold text-white">
                  Retry
                </Text>
              </Pressable>
            </View>
          )}

          <View className="mb-3 mt-7 flex-row items-end justify-between">
            <View>
              <Text className="text-[16px] font-extrabold text-ink-dark">
                Fleet
              </Text>

              <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
                {filteredJeepneys.length} jeepneys shown
              </Text>
            </View>
          </View>

          {filteredJeepneys.length === 0 ? (
            <EmptyFleet search={search} />
          ) : (
            <View>
              {filteredJeepneys.map((jeepney) => (
                <JeepneyCard
                  key={jeepney.id}
                  jeepney={jeepney}
                  onPress={() =>
                    router.push(`/staff/(admin)/jeepneys/${jeepney.id}`)
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <AddJeepneyModal
        visible={addVisible}
        plateNumber={plateNumber}
        setPlateNumber={setPlateNumber}
        jeepName={jeepName}
        setJeepName={setJeepName}
        bracket={bracket}
        setBracket={setBracket}
        capacity={capacity}
        setCapacity={setCapacity}
        selectedDriver={selectedDriver}
        setSelectedDriver={setSelectedDriver}
        availableDrivers={availableDrivers}
        driversLoading={driversLoading}
        driversError={driversError}
        driverPickerOpen={driverPickerOpen}
        setDriverPickerOpen={setDriverPickerOpen}
        saving={saving}
        error={modalError}
        onClose={closeAddModal}
        onSubmit={handleAddJeepney}
      />

      <ResultModal
        visible={successVisible}
        type="success"
        title="Jeepney Added"
        message={successMessage}
        onClose={() => setSuccessVisible(false)}
      />
    </OceanBackground>
  );
}

function AddJeepneyModal({
  visible,
  plateNumber,
  setPlateNumber,
  jeepName,
  setJeepName,
  bracket,
  setBracket,
  capacity,
  setCapacity,
  selectedDriver,
  setSelectedDriver,
  availableDrivers,
  driversLoading,
  driversError,
  driverPickerOpen,
  setDriverPickerOpen,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  plateNumber: string;
  setPlateNumber: (value: string) => void;
  jeepName: string;
  setJeepName: (value: string) => void;
  bracket: string;
  setBracket: (value: string) => void;
  capacity: string;
  setCapacity: (value: string) => void;
  selectedDriver: AvailableDriver | null;
  setSelectedDriver: (driver: AvailableDriver | null) => void;
  availableDrivers: AvailableDriver[];
  driversLoading: boolean;
  driversError: string | null;
  driverPickerOpen: boolean;
  setDriverPickerOpen: (value: boolean) => void;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 justify-center bg-black/30 px-5">
          <View className="max-h-[88%] overflow-hidden rounded-[30px] border border-white/95 bg-clay-surface">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: 22,
                paddingBottom: 28,
              }}
            >
              <View className="flex-row items-center">
                <View className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-ocean-100">
                  <BusFront
                    size={24}
                    color={colors.primaryDark}
                    strokeWidth={2.3}
                  />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[18px] font-extrabold text-ink-dark">
                    Add Jeepney
                  </Text>

                  <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
                    Add a vehicle to the fleet
                  </Text>
                </View>

                <Pressable
                  onPress={onClose}
                  disabled={saving}
                  className="h-[38px] w-[38px] items-center justify-center rounded-full bg-slate-100"
                >
                  <X size={18} color="#64748B" strokeWidth={2.4} />
                </Pressable>
              </View>

              {error && (
                <View className="mt-5 rounded-[18px] border border-red-100 bg-red-50/90 p-4">
                  <View className="flex-row items-start">
                    <View className="h-[36px] w-[36px] items-center justify-center rounded-[12px] bg-white">
                      <AlertTriangle
                        size={18}
                        color="#DC2626"
                        strokeWidth={2.4}
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-[12px] font-extrabold text-red-700">
                        Unable to add jeepney
                      </Text>

                      <Text className="mt-1 text-[10px] leading-[16px] text-red-600">
                        {error}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <InputField
                label="Plate Number"
                value={plateNumber}
                onChangeText={setPlateNumber}
                placeholder="e.g. ABC-1234"
                autoCapitalize="characters"
              />

              <InputField
                label="Jeepney Name"
                value={jeepName}
                onChangeText={setJeepName}
                placeholder="Optional"
              />

              <View className="flex-row">
                <View className="flex-1">
                  <InputField
                    label="Bracket"
                    value={bracket}
                    onChangeText={setBracket}
                    placeholder="e.g. 1"
                    keyboardType="number-pad"
                  />
                </View>

                <View className="ml-3 flex-1">
                  <InputField
                    label="Max Capacity"
                    value={capacity}
                    onChangeText={setCapacity}
                    placeholder="e.g. 24"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text className="mb-2 mt-1 text-[10px] font-extrabold uppercase tracking-[0.6px] text-ink-muted">
                Driver
              </Text>

              <Pressable
                onPress={() => setDriverPickerOpen(!driverPickerOpen)}
                disabled={saving}
                className="min-h-[52px] flex-row items-center rounded-[17px] border border-white bg-white/80 px-4"
              >
                <Users size={17} color="#64748B" strokeWidth={2.2} />

                <Text
                  className={`ml-3 flex-1 text-[12px] font-semibold ${
                    selectedDriver ? "text-ink-dark" : "text-slate-400"
                  }`}
                >
                  {selectedDriver
                    ? selectedDriver.display_name
                    : "No driver assigned"}
                </Text>

                <ChevronDown size={17} color="#64748B" strokeWidth={2.2} />
              </Pressable>

              {driverPickerOpen && (
                <View className="mt-2 max-h-[180px] overflow-hidden rounded-[18px] border border-white bg-white/90">
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    <Pressable
                      onPress={() => {
                        setSelectedDriver(null);
                        setDriverPickerOpen(false);
                      }}
                      className="border-b border-slate-100 px-4 py-3"
                    >
                      <Text className="text-[11px] font-extrabold text-ink-secondary">
                        No driver assigned
                      </Text>
                    </Pressable>

                    {driversLoading ? (
                      <View className="items-center py-5">
                        <ActivityIndicator
                          size="small"
                          color={colors.primaryDark}
                        />
                      </View>
                    ) : driversError ? (
                      <View className="px-4 py-4">
                        <Text className="text-[10px] leading-[15px] text-red-600">
                          {driversError}
                        </Text>
                      </View>
                    ) : availableDrivers.length === 0 ? (
                      <View className="px-4 py-4">
                        <Text className="text-[10px] leading-[15px] text-ink-muted">
                          No unassigned drivers are currently available.
                        </Text>
                      </View>
                    ) : (
                      availableDrivers.map((driver) => (
                        <Pressable
                          key={driver.id}
                          onPress={() => {
                            setSelectedDriver(driver);
                            setDriverPickerOpen(false);
                          }}
                          className="border-b border-slate-100 px-4 py-3"
                        >
                          <Text className="text-[11px] font-extrabold text-ink-dark">
                            {driver.display_name}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}

              <Text className="mt-2 text-[9px] leading-[14px] text-ink-muted">
                Driver assignment is optional. Only drivers who are not
                currently assigned to another jeepney are shown.
              </Text>

              <View className="mt-6 flex-row">
                <Pressable
                  onPress={onClose}
                  disabled={saving}
                  className="flex-1 items-center justify-center rounded-full bg-slate-100 py-3.5"
                >
                  <Text className="text-[11px] font-extrabold text-ink-secondary">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onSubmit}
                  disabled={saving}
                  className={`ml-3 flex-1 flex-row items-center justify-center rounded-full py-3.5 ${
                    saving ? "bg-ocean-200" : "bg-ocean-400"
                  }`}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
                  )}

                  <Text className="ml-2 text-[11px] font-extrabold text-white">
                    {saving ? "Adding..." : "Add Jeepney"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.6px] text-ink-muted">
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className="rounded-[17px] border border-white bg-white/80 px-4 py-3.5 text-[12px] font-semibold text-ink-dark"
      />
    </View>
  );
}

function ResultModal({
  visible,
  type,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
}) {
  const success = type === "success";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/30 px-7">
        <View className="w-full rounded-[30px] border border-white/95 bg-clay-surface p-6">
          <View className="items-center">
            <View
              className={`h-[64px] w-[64px] items-center justify-center rounded-[22px] ${
                success ? "bg-emerald-100" : "bg-red-100"
              }`}
            >
              {success ? (
                <CheckCircle2 size={31} color="#059669" strokeWidth={2.4} />
              ) : (
                <AlertTriangle size={31} color="#DC2626" strokeWidth={2.4} />
              )}
            </View>

            <Text className="mt-4 text-center text-[18px] font-extrabold text-ink-dark">
              {title}
            </Text>

            <Text className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary">
              {message}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            className={`mt-6 items-center rounded-full py-3.5 ${
              success ? "bg-ocean-400" : "bg-slate-700"
            }`}
          >
            <Text className="text-[11px] font-extrabold text-white">Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function JeepneyCard({
  jeepney,
  onPress,
}: {
  jeepney: AdminJeepneyRecord;
  onPress: () => void;
}) {
  const capacity = Math.max(jeepney.capacity, 1);

  const occupancy = Math.min(
    100,
    Math.round((jeepney.current_occupancy / capacity) * 100),
  );

  const status = getStatusPresentation(jeepney.status);

  const assignment = jeepney.terminal_name
    ? `${jeepney.terminal_name} • Bracket ${jeepney.bracket}`
    : `Bracket ${jeepney.bracket}`;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-[25px] border border-white/90 bg-clay-surface p-5"
    >
      <View className="flex-row items-center">
        <View className="h-[50px] w-[50px] items-center justify-center rounded-[16px] bg-ocean-100">
          <BusFront size={24} color={colors.primaryDark} strokeWidth={2.3} />
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[14px] font-extrabold text-ink-dark"
          >
            {jeepney.jeep_name || jeepney.plate_number || "Unnamed Jeepney"}
          </Text>

          <Text className="mt-0.5 text-[10px] font-medium text-ink-secondary">
            {jeepney.plate_number || "No plate number"}
          </Text>
        </View>

        <View
          className="rounded-full px-3 py-1.5"
          style={{
            backgroundColor: status.background,
          }}
        >
          <Text
            className="text-[9px] font-extrabold uppercase"
            style={{
              color: status.color,
            }}
          >
            {status.label}
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row">
        <InfoBlock
          icon={<Users size={14} color="#64748B" strokeWidth={2.3} />}
          label="Driver"
          value={jeepney.driver_name || "Unassigned"}
        />

        <InfoBlock
          icon={<MapPin size={14} color="#64748B" strokeWidth={2.3} />}
          label="Terminal"
          value={jeepney.terminal_name || "Unassigned"}
        />

        <InfoBlock
          icon={<Clock3 size={14} color="#64748B" strokeWidth={2.3} />}
          label="Bracket"
          value={String(jeepney.bracket)}
        />
      </View>

      <View className="mt-4 rounded-[16px] bg-ocean-50 px-3 py-2.5">
        <View className="flex-row items-center">
          <MapPin size={13} color={colors.primaryDark} strokeWidth={2.3} />

          <Text className="ml-1.5 text-[9px] font-extrabold uppercase tracking-[0.4px] text-ocean-700">
            Assignment
          </Text>
        </View>

        <Text className="mt-1 text-[11px] font-extrabold text-ink-dark">
          {assignment}
        </Text>
      </View>

      <View className="mt-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-bold uppercase tracking-[0.6px] text-ink-muted">
            Occupancy
          </Text>

          <Text className="text-[11px] font-extrabold text-ink-dark">
            {jeepney.current_occupancy} / {jeepney.capacity}
          </Text>
        </View>

        <View className="mt-2 h-[8px] overflow-hidden rounded-full bg-slate-100">
          <View
            className="h-full rounded-full bg-ocean-400"
            style={{
              width: `${occupancy}%`,
            }}
          />
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          {jeepney.status === "waiting" ? (
            <Clock3 size={14} color="#0284C7" strokeWidth={2.3} />
          ) : jeepney.status === "inactive" ? (
            <XCircle size={14} color="#64748B" strokeWidth={2.3} />
          ) : (
            <CheckCircle2 size={14} color="#059669" strokeWidth={2.3} />
          )}

          <Text className="ml-1.5 text-[10px] font-semibold text-ink-secondary">
            {jeepney.status === "inactive"
              ? jeepney.last_gps_at
                ? "No GPS reported today"
                : "No GPS activity today"
              : jeepney.queue_position !== null
                ? `Queue position ${jeepney.queue_position}`
                : "No queue position"}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Text className="mr-1 text-[10px] font-extrabold text-ocean-700">
            View details
          </Text>

          <ChevronRight
            size={15}
            color={colors.primaryDark}
            strokeWidth={2.3}
          />
        </View>
      </View>
    </Pressable>
  );
}

function InfoBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center">
        {icon}

        <Text className="ml-1 text-[9px] font-bold uppercase tracking-[0.4px] text-ink-muted">
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        className="mt-1 text-[11px] font-extrabold text-ink-dark"
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyFleet({ search }: { search: string }) {
  return (
    <View className="items-center rounded-[25px] border border-white/90 bg-white/70 px-6 py-8">
      <View className="h-[54px] w-[54px] items-center justify-center rounded-[17px] bg-ocean-100">
        <BusFront size={24} color={colors.primaryDark} strokeWidth={2.3} />
      </View>

      <Text className="mt-3 text-[14px] font-extrabold text-ink-dark">
        {search ? "No jeepneys found" : "No jeepneys available"}
      </Text>

      <Text className="mt-1 max-w-[280px] text-center text-[10px] leading-[16px] text-ink-secondary">
        {search
          ? "Try searching with a different jeepney name, plate number, driver, or terminal."
          : "There are currently no jeepneys available in the fleet."}
      </Text>
    </View>
  );
}

function getStatusPresentation(status: AdminJeepneyRecord["status"]) {
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
