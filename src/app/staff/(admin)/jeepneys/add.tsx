import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  Check,
  ChevronDown,
  MapPin,
  UserRound,
  Users,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { supabase } from "@/src/shared/config/supabase";
import { colors } from "@/src/shared/constants/theme";

interface Terminal {
  id: string;
  terminal_number: number;
  name: string;
  bracket_number: number;
  is_active: boolean;
}

interface Driver {
  id: string;
  name: string;
}

export default function AddJeepneyScreen() {
  const router = useRouter();

  const [plateNumber, setPlateNumber] = useState("");
  const [jeepName, setJeepName] = useState("");
  const [capacity, setCapacity] = useState("24");

  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(
    null,
  );

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const [showTerminalPicker, setShowTerminalPicker] = useState(false);

  const [showDriverPicker, setShowDriverPicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        { data: terminalData, error: terminalError },
        { data: driverData, error: driverError },
      ] = await Promise.all([
        supabase
          .from("terminals")
          .select("id, terminal_number, name, bracket_number, is_active")
          .eq("is_active", true)
          .order("terminal_number", {
            ascending: true,
          }),

        supabase
          .from("users")
          .select("id, full_name")
          .eq("role", "driver")
          .order("full_name", {
            ascending: true,
          }),
      ]);

      if (terminalError) {
        throw terminalError;
      }

      if (driverError) {
        throw driverError;
      }

      const normalizedTerminals: Terminal[] = (terminalData ?? []).map(
        (terminal: any) => ({
          id: terminal.id,
          terminal_number: Number(terminal.terminal_number),
          name: terminal.name,
          bracket_number: Number(terminal.bracket_number),
          is_active: Boolean(terminal.is_active),
        }),
      );

      const normalizedDrivers: Driver[] = (driverData ?? []).map(
        (driver: any) => ({
          id: driver.id,
          name: driver.full_name || driver.name || "Unnamed Driver",
        }),
      );

      setTerminals(normalizedTerminals);
      setDrivers(normalizedDrivers);
    } catch (err: any) {
      console.error("❌ Failed to load jeepney form options:", err);

      setError(err?.message ?? "Unable to load terminals and drivers.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = useMemo(() => {
    const parsedCapacity = Number(capacity);

    return (
      plateNumber.trim().length > 0 &&
      selectedTerminal !== null &&
      parsedCapacity > 0
    );
  }, [plateNumber, selectedTerminal, capacity]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/staff/(admin)/jeepneys");
  };

  const handleSave = async () => {
    if (!canSubmit || !selectedTerminal) {
      return;
    }

    const parsedCapacity = Number(capacity);

    if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
      Alert.alert(
        "Invalid Capacity",
        "Please enter a valid passenger capacity.",
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const normalizedPlate = plateNumber.trim().toUpperCase();

      const normalizedName = jeepName.trim() || null;

      /*
       * Check for duplicate plate number first.
       */
      const { data: existingJeepney, error: duplicateError } = await supabase
        .from("jeepneys")
        .select("id")
        .eq("plate_number", normalizedPlate)
        .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (existingJeepney) {
        Alert.alert(
          "Duplicate Jeepney",
          "A jeepney with this plate number already exists.",
        );
        return;
      }

      /*
       * Create jeepney.
       */
      const { data: jeepney, error: jeepneyError } = await supabase
        .from("jeepneys")
        .insert({
          plate_number: normalizedPlate,
          jeep_name: normalizedName,
          driver_id: selectedDriver?.id ?? null,
          driver_name: selectedDriver?.name ?? null,
          bracket: selectedTerminal.bracket_number,
          capacity: parsedCapacity,
          current_occupancy: 0,
          status: "inactive",
          queue_position: null,
          departure_time: null,
          eta: null,
          current_latitude: null,
          current_longitude: null,
          terminal_id: selectedTerminal.terminal_number,
          loading_ends_at: null,
        })
        .select("id")
        .single();

      if (jeepneyError) {
        throw jeepneyError;
      }

      if (!jeepney) {
        throw new Error(
          "The jeepney was created but no jeepney ID was returned.",
        );
      }

      /*
       * Create the new terminal assignment.
       */
      const { error: assignmentError } = await supabase
        .from("terminal_jeepneys")
        .insert({
          terminal_id: selectedTerminal.id,
          jeepney_id: jeepney.id,
          is_active: true,
        });

      if (assignmentError) {
        /*
         * Roll the jeepney back if terminal assignment fails.
         */
        await supabase.from("jeepneys").delete().eq("id", jeepney.id);

        throw assignmentError;
      }

      Alert.alert(
        "Jeepney Added",
        `${normalizedPlate} has been added to ${selectedTerminal.name}.`,
        [
          {
            text: "OK",
            onPress: () => {
              router.replace(`/staff/(admin)/jeepneys/${jeepney.id}`);
            },
          },
        ],
      );
    } catch (err: any) {
      console.error("❌ Failed to add jeepney:", err);

      setError(err?.message ?? "Unable to add the jeepney.");
    } finally {
      setSaving(false);
    }
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
              Preparing form...
            </Text>

            <Text className="mt-1 text-center text-[11px] text-ink-muted">
              Loading terminals and available drivers
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
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 150,
          }}
        >
          <View className="flex-row items-center">
            <Pressable
              onPress={handleBack}
              className="h-[48px] w-[48px] items-center justify-center rounded-[17px] border border-white/90 bg-clay-surface"
            >
              <ArrowLeft
                size={21}
                color={colors.primaryDark}
                strokeWidth={2.4}
              />
            </Pressable>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-ocean-700">
                MANAGEMENT
              </Text>

              <Text className="mt-0.5 text-[23px] font-extrabold text-ink-dark">
                Add Jeepney
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-[27px] border border-white/90 bg-clay-surface p-5">
            <View className="flex-row items-center">
              <View className="h-[58px] w-[58px] items-center justify-center rounded-[19px] bg-ocean-100">
                <BusFront
                  size={28}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-extrabold text-ink-dark">
                  Register Jeepney
                </Text>

                <Text className="mt-1 text-[10px] leading-[16px] text-ink-muted">
                  Add the jeepney to the fleet and assign its operating
                  terminal.
                </Text>
              </View>
            </View>
          </View>

          {error && (
            <View className="mt-4 rounded-[22px] border border-red-100 bg-red-50 p-4">
              <View className="flex-row items-start">
                <AlertTriangle size={18} color="#DC2626" strokeWidth={2.3} />

                <Text className="ml-2 flex-1 text-[10px] font-semibold leading-[16px] text-red-700">
                  {error}
                </Text>
              </View>
            </View>
          )}

          <SectionTitle
            icon={
              <BusFront
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Jeepney Information"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <Field
              label="Plate Number"
              placeholder="e.g. ABC 1234"
              value={plateNumber}
              onChangeText={setPlateNumber}
              autoCapitalize="characters"
            />

            <View className="mt-4">
              <Field
                label="Jeepney Name"
                placeholder="Optional jeepney name"
                value={jeepName}
                onChangeText={setJeepName}
              />
            </View>

            <View className="mt-4">
              <Field
                label="Passenger Capacity"
                placeholder="24"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <SectionTitle
            icon={
              <MapPin size={17} color={colors.primaryDark} strokeWidth={2.3} />
            }
            title="Terminal Assignment"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
              Operating Terminal
            </Text>

            <Pressable
              onPress={() => setShowTerminalPicker((current) => !current)}
              className="mt-2 flex-row items-center rounded-[17px] bg-slate-50 px-4 py-4"
            >
              <MapPin size={17} color="#64748B" strokeWidth={2.2} />

              <View className="ml-3 flex-1">
                <Text className="text-[12px] font-extrabold text-ink-dark">
                  {selectedTerminal ? selectedTerminal.name : "Select terminal"}
                </Text>

                <Text className="mt-0.5 text-[9px] font-semibold text-ink-muted">
                  {selectedTerminal
                    ? `Terminal ${selectedTerminal.terminal_number} • Bracket ${selectedTerminal.bracket_number}`
                    : "Choose the terminal for this jeepney"}
                </Text>
              </View>

              <ChevronDown size={17} color="#64748B" strokeWidth={2.2} />
            </Pressable>

            {showTerminalPicker && (
              <View className="mt-2 overflow-hidden rounded-[17px] bg-slate-50">
                {terminals.length === 0 ? (
                  <View className="px-4 py-4">
                    <Text className="text-[10px] font-semibold text-ink-muted">
                      No active terminals available.
                    </Text>
                  </View>
                ) : (
                  terminals.map((terminal) => {
                    const selected = selectedTerminal?.id === terminal.id;

                    return (
                      <Pressable
                        key={terminal.id}
                        onPress={() => {
                          setSelectedTerminal(terminal);
                          setShowTerminalPicker(false);
                        }}
                        className="flex-row items-center border-b border-white px-4 py-3.5"
                      >
                        <View className="h-[36px] w-[36px] items-center justify-center rounded-[12px] bg-white">
                          <MapPin
                            size={16}
                            color={colors.primaryDark}
                            strokeWidth={2.2}
                          />
                        </View>

                        <View className="ml-3 flex-1">
                          <Text className="text-[11px] font-extrabold text-ink-dark">
                            {terminal.name}
                          </Text>

                          <Text className="mt-0.5 text-[9px] font-semibold text-ink-muted">
                            Terminal {terminal.terminal_number} • Bracket{" "}
                            {terminal.bracket_number}
                          </Text>
                        </View>

                        {selected && (
                          <Check
                            size={17}
                            color={colors.primaryDark}
                            strokeWidth={2.7}
                          />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}

            {selectedTerminal && (
              <View className="mt-3 flex-row rounded-[16px] bg-ocean-50 px-4 py-3">
                <MapPin
                  size={15}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />

                <View className="ml-2 flex-1">
                  <Text className="text-[9px] font-extrabold uppercase tracking-[0.4px] text-ocean-700">
                    Assignment
                  </Text>

                  <Text className="mt-1 text-[11px] font-extrabold text-ink-dark">
                    {selectedTerminal.name}
                  </Text>

                  <Text className="mt-0.5 text-[9px] font-semibold text-ink-secondary">
                    Bracket {selectedTerminal.bracket_number}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <SectionTitle
            icon={
              <UserRound
                size={17}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />
            }
            title="Driver Assignment"
          />

          <View className="rounded-[25px] border border-white/90 bg-clay-surface p-5">
            <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
              Driver
            </Text>

            <Pressable
              onPress={() => setShowDriverPicker((current) => !current)}
              className="mt-2 flex-row items-center rounded-[17px] bg-slate-50 px-4 py-4"
            >
              <View className="h-[36px] w-[36px] items-center justify-center rounded-[12px] bg-white">
                <UserRound size={16} color="#64748B" strokeWidth={2.2} />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[12px] font-extrabold text-ink-dark">
                  {selectedDriver ? selectedDriver.name : "No driver assigned"}
                </Text>

                <Text className="mt-0.5 text-[9px] font-semibold text-ink-muted">
                  Driver assignment is optional
                </Text>
              </View>

              <ChevronDown size={17} color="#64748B" strokeWidth={2.2} />
            </Pressable>

            {showDriverPicker && (
              <View className="mt-2 overflow-hidden rounded-[17px] bg-slate-50">
                <Pressable
                  onPress={() => {
                    setSelectedDriver(null);
                    setShowDriverPicker(false);
                  }}
                  className="flex-row items-center border-b border-white px-4 py-3.5"
                >
                  <View className="h-[36px] w-[36px] items-center justify-center rounded-[12px] bg-white">
                    <XIcon />
                  </View>

                  <Text className="ml-3 flex-1 text-[11px] font-extrabold text-ink-dark">
                    No driver assigned
                  </Text>

                  {!selectedDriver && (
                    <Check
                      size={17}
                      color={colors.primaryDark}
                      strokeWidth={2.7}
                    />
                  )}
                </Pressable>

                {drivers.map((driver) => {
                  const selected = selectedDriver?.id === driver.id;

                  return (
                    <Pressable
                      key={driver.id}
                      onPress={() => {
                        setSelectedDriver(driver);
                        setShowDriverPicker(false);
                      }}
                      className="flex-row items-center border-b border-white px-4 py-3.5"
                    >
                      <View className="h-[36px] w-[36px] items-center justify-center rounded-[12px] bg-white">
                        <UserRound
                          size={16}
                          color="#64748B"
                          strokeWidth={2.2}
                        />
                      </View>

                      <Text className="ml-3 flex-1 text-[11px] font-extrabold text-ink-dark">
                        {driver.name}
                      </Text>

                      {selected && (
                        <Check
                          size={17}
                          color={colors.primaryDark}
                          strokeWidth={2.7}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View className="mt-5 rounded-[22px] bg-ocean-50 p-4">
            <View className="flex-row items-start">
              <Users size={17} color={colors.primaryDark} strokeWidth={2.3} />

              <View className="ml-2 flex-1">
                <Text className="text-[10px] font-extrabold text-ocean-700">
                  Assignment behavior
                </Text>

                <Text className="mt-1 text-[10px] leading-[16px] text-ink-secondary">
                  The selected terminal determines the jeepney's terminal number
                  and bracket. A matching terminal_jeepneys assignment will also
                  be created automatically.
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            disabled={!canSubmit || saving}
            onPress={handleSave}
            className={`mt-6 h-[52px] flex-row items-center justify-center rounded-full ${
              canSubmit && !saving ? "bg-ocean-400" : "bg-slate-300"
            }`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Check size={18} color="#FFFFFF" strokeWidth={2.7} />
            )}

            <Text className="ml-2 text-[12px] font-extrabold text-white">
              {saving ? "Adding Jeepney..." : "Add Jeepney"}
            </Text>
          </Pressable>

          <Pressable
            disabled={saving}
            onPress={handleBack}
            className="mt-3 h-[48px] items-center justify-center rounded-full"
          >
            <Text className="text-[11px] font-extrabold text-ink-secondary">
              Cancel
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </OceanBackground>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="mb-2 mt-6 flex-row items-center">
      <View className="h-[31px] w-[31px] items-center justify-center rounded-[11px] bg-ocean-100">
        {icon}
      </View>

      <Text className="ml-2 text-[14px] font-extrabold text-ink-dark">
        {title}
      </Text>
    </View>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View>
      <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        className="mt-2 rounded-[17px] bg-slate-50 px-4 py-4 text-[12px] font-extrabold text-ink-dark"
      />
    </View>
  );
}

function XIcon() {
  return (
    <View className="h-[14px] w-[14px] items-center justify-center">
      <View className="absolute h-[2px] w-[12px] rotate-45 rounded-full bg-slate-500" />
      <View className="absolute h-[2px] w-[12px] -rotate-45 rounded-full bg-slate-500" />
    </View>
  );
}
