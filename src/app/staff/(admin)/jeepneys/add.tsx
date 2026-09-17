import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  Camera,
  Check,
  ChevronDown,
  Image as ImageIcon,
  MapPin,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageSourceVisible, setImageSourceVisible] = useState(false);

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
        { data: assignedJeepneys, error: assignedJeepneysError },
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

        // A driver is unavailable whenever their driver_id is already
        // attached to any existing jeepney. Status does not matter here.
        supabase
          .from("jeepneys")
          .select("driver_id")
          .not("driver_id", "is", null),
      ]);

      if (terminalError) {
        throw terminalError;
      }

      if (driverError) {
        throw driverError;
      }

      if (assignedJeepneysError) {
        throw assignedJeepneysError;
      }

      const assignedDriverIds = new Set(
        (assignedJeepneys ?? [])
          .map((jeepney: any) => jeepney.driver_id)
          .filter(Boolean),
      );

      const normalizedTerminals: Terminal[] = (terminalData ?? []).map(
        (terminal: any) => ({
          id: terminal.id,
          terminal_number: Number(terminal.terminal_number),
          name: terminal.name,
          bracket_number: Number(terminal.bracket_number),
          is_active: Boolean(terminal.is_active),
        }),
      );

      const normalizedDrivers: Driver[] = (driverData ?? [])
        .filter((driver: any) => !assignedDriverIds.has(driver.id))
        .map((driver: any) => ({
          id: driver.id,
          name: driver.full_name || driver.name || "Unnamed Driver",
        }));

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

  const pickImage = async () => {
    if (saving || imageUploading) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo Access Required",
          "Allow photo access so you can select a jeepney picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Failed to select jeepney image:", err);
      Alert.alert(
        "Unable to Select Photo",
        "The jeepney photo could not be selected.",
      );
    }
  };

  const takePhoto = async () => {
    if (saving || imageUploading) return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera Access Required",
          "Allow camera access so you can take a jeepney picture.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Failed to take jeepney image:", err);
      Alert.alert(
        "Unable to Take Photo",
        "The jeepney photo could not be captured.",
      );
    }
  };

  const chooseImageSource = () => {
    if (saving || imageUploading) return;
    setImageSourceVisible(true);
  };

  const uploadJeepneyImage = async (jeepneyId: string, uri: string) => {
    setImageUploading(true);
    try {
      const response = await fetch(uri);
      if (!response.ok) throw new Error("Unable to read the selected image.");

      const arrayBuffer = await response.arrayBuffer();
      const extension =
        uri
          .split(".")
          .pop()
          ?.split("?")[0]
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";
      const contentType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";
      const path = `${jeepneyId}/profile`;

      const { error: uploadError } = await supabase.storage
        .from("jeepney-images")
        .upload(path, arrayBuffer, {
          contentType,
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("jeepney-images")
        .getPublicUrl(path);
      if (!data.publicUrl)
        throw new Error(
          "The image was uploaded but no public URL was returned.",
        );

      const imageUrl = `${data.publicUrl}?v=${Date.now()}`;
      const { error: databaseError } = await supabase
        .from("jeepneys")
        .update({ image_url: imageUrl })
        .eq("id", jeepneyId);

      if (databaseError) throw databaseError;
      return imageUrl;
    } finally {
      setImageUploading(false);
    }
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
          image_url: null,
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
        await supabase.from("jeepneys").delete().eq("id", jeepney.id);
        throw assignmentError;
      }

      if (imageUri) {
        try {
          setImageUploading(true);
          await uploadJeepneyImage(jeepney.id, imageUri);
        } catch (imageError: any) {
          console.error("Failed to upload jeepney image:", imageError);
          await supabase
            .from("terminal_jeepneys")
            .delete()
            .eq("jeepney_id", jeepney.id);
          await supabase.from("jeepneys").delete().eq("id", jeepney.id);
          throw new Error(
            imageError?.message ?? "The jeepney photo could not be uploaded.",
          );
        } finally {
          setImageUploading(false);
        }
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
              <BusFront size={58} />

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

            <View className="mt-5 items-center">
              <View className="h-[160px] w-full overflow-hidden rounded-[22px] border border-white bg-slate-100">
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <ImageIcon size={42} color="#94A3B8" strokeWidth={1.8} />
                    <Text className="mt-2 text-[10px] font-bold text-slate-400">
                      No photo selected
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                disabled={saving}
                onPress={chooseImageSource}
                className="mt-3 flex-row items-center rounded-full bg-ocean-400 px-5 py-3"
              >
                <Camera size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text className="ml-2 text-[11px] font-extrabold text-white">
                  {imageUri ? "Change Photo" : "Add Photo"}
                </Text>
              </Pressable>

              {imageUri && (
                <Pressable
                  disabled={saving}
                  onPress={() => setImageUri(null)}
                  className="mt-2 flex-row items-center rounded-full px-4 py-2"
                >
                  <Trash2 size={14} color="#DC2626" strokeWidth={2.3} />
                  <Text className="ml-1.5 text-[10px] font-extrabold text-red-600">
                    Remove Photo
                  </Text>
                </Pressable>
              )}
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
              {imageUploading
                ? "Uploading Photo..."
                : saving
                  ? "Adding Jeepney..."
                  : "Add Jeepney"}
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

        <ImageSourceModal
          visible={imageSourceVisible}
          hasImage={Boolean(imageUri)}
          saving={saving || imageUploading}
          onClose={() => setImageSourceVisible(false)}
          onGallery={async () => {
            setImageSourceVisible(false);
            await pickImage();
          }}
          onCamera={async () => {
            setImageSourceVisible(false);
            await takePhoto();
          }}
          onRemove={() => {
            setImageUri(null);
            setImageSourceVisible(false);
          }}
        />
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

function ImageSourceModal({
  visible,
  hasImage,
  saving,
  onClose,
  onGallery,
  onCamera,
  onRemove,
}: {
  visible: boolean;
  hasImage: boolean;
  saving: boolean;
  onClose: () => void;
  onGallery: () => void | Promise<void>;
  onCamera: () => void | Promise<void>;
  onRemove: () => void;
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
        <View className="flex-1 items-center justify-center bg-black/35 px-5">
          <View className="w-full max-w-[390px] rounded-[30px] border border-white/95 bg-clay-surface p-5">
            <View className="flex-row items-center">
              <View className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-ocean-100">
                <Camera
                  size={22}
                  color={colors.primaryDark}
                  strokeWidth={2.4}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[16px] font-extrabold text-ink-dark">
                  Jeepney Photo
                </Text>
                <Text className="mt-0.5 text-[10px] leading-[15px] text-ink-muted">
                  Choose a photo source for this jeepney.
                </Text>
              </View>
              <Pressable
                disabled={saving}
                onPress={onClose}
                className="h-[38px] w-[38px] items-center justify-center rounded-full bg-slate-100"
              >
                <XCircle size={19} color="#64748B" strokeWidth={2.3} />
              </Pressable>
            </View>

            <Pressable
              disabled={saving}
              onPress={onGallery}
              className="mt-5 flex-row items-center rounded-[21px] border border-white/90 bg-white px-4 py-4"
            >
              <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
                <ImageIcon
                  size={20}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[12px] font-extrabold text-ink-dark">
                  Choose from Gallery
                </Text>
                <Text className="mt-0.5 text-[10px] text-ink-muted">
                  Select an existing jeepney picture.
                </Text>
              </View>
            </Pressable>

            <Pressable
              disabled={saving}
              onPress={onCamera}
              className="mt-3 flex-row items-center rounded-[21px] border border-white/90 bg-white px-4 py-4"
            >
              <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-sky-100">
                <Camera size={20} color="#0284C7" strokeWidth={2.3} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[12px] font-extrabold text-ink-dark">
                  Take Photo
                </Text>
                <Text className="mt-0.5 text-[10px] text-ink-muted">
                  Use the device camera.
                </Text>
              </View>
            </Pressable>

            {hasImage && (
              <Pressable
                disabled={saving}
                onPress={onRemove}
                className="mt-3 flex-row items-center justify-center rounded-full bg-red-50 py-3.5"
              >
                <Trash2 size={16} color="#DC2626" strokeWidth={2.3} />
                <Text className="ml-2 text-[11px] font-extrabold text-red-600">
                  Remove Photo
                </Text>
              </Pressable>
            )}

            <Pressable
              disabled={saving}
              onPress={onClose}
              className="mt-3 items-center rounded-full bg-slate-100 py-3.5"
            >
              <Text className="text-[11px] font-extrabold text-ink-secondary">
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
