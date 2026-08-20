import { useRouter } from "expo-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  AdminStaffRecord,
  AdminStaffRole,
  CreateStaffData,
  useAdminStaff,
} from "@/src/shared/hooks/admin/useAdminStaff";

type StaffFilter =
  "all" | "active" | "inactive" | "driver" | "dispatcher" | "admin";

const FILTERS: {
  label: string;
  value: StaffFilter;
}[] = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Active",
    value: "active",
  },
  {
    label: "Inactive",
    value: "inactive",
  },
  {
    label: "Drivers",
    value: "driver",
  },
  {
    label: "Dispatchers",
    value: "dispatcher",
  },
  {
    label: "Admins",
    value: "admin",
  },
];

export default function AdminStaffScreen() {
  const router = useRouter();

  const { staff, loading, refreshing, error, refresh, createStaff } =
    useAdminStaff();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StaffFilter>("all");

  const [showAddModal, setShowAddModal] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [createdStaffName, setCreatedStaffName] = useState("");

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();

    return staff.filter((member) => {
      const matchesSearch =
        !query ||
        member.display_name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.phone_number?.toLowerCase().includes(query) ||
        member.jeepney_plate_number?.toLowerCase().includes(query) ||
        member.jeepney_name?.toLowerCase().includes(query);

      let matchesFilter = true;

      switch (filter) {
        case "active":
          matchesFilter = member.is_active;
          break;

        case "inactive":
          matchesFilter = !member.is_active;
          break;

        case "driver":
          matchesFilter = member.role === "driver";
          break;

        case "dispatcher":
          matchesFilter = member.role === "dispatcher";
          break;

        case "admin":
          matchesFilter = member.role === "admin";
          break;

        default:
          matchesFilter = true;
      }

      return matchesSearch && matchesFilter;
    });
  }, [staff, search, filter]);

  const handleCreateStaff = async (data: CreateStaffData) => {
    try {
      await createStaff(data);

      setShowAddModal(false);

      setCreatedStaffName(data.display_name);

      setTimeout(() => {
        setShowSuccessModal(true);
      }, 150);
    } catch (err: any) {
      Alert.alert(
        "Unable to Create Staff",
        err?.message ??
          "Something went wrong while creating the staff account.",
      );
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
              Loading staff...
            </Text>

            <Text className="mt-1 text-center text-[11px] text-ink-muted">
              Getting staff management information
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
            paddingTop: 14,
            paddingBottom: 140,
          }}
        >
          {/* =====================================================
              HEADER
          ====================================================== */}

          <View className="flex-row items-center">
            <View className="h-[50px] w-[50px] items-center justify-center rounded-[18px] bg-ocean-100">
              <Users size={24} color={colors.primaryDark} strokeWidth={2.4} />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-ocean-700">
                MANAGEMENT
              </Text>

              <Text className="mt-0.5 text-[25px] font-extrabold text-ink-dark">
                Staff
              </Text>
            </View>

            {/* STAFF COUNT + ADD BUTTON */}

            <View className="flex-row items-center">
              <View className="rounded-full bg-ocean-100 px-3 py-2">
                <Text className="text-[11px] font-extrabold text-ocean-700">
                  {staff.length}
                </Text>
              </View>

              <Pressable
                onPress={() => setShowAddModal(true)}
                className="ml-2 h-[40px] w-[40px] items-center justify-center rounded-full bg-ocean-400"
                style={{
                  shadowColor: colors.primaryDark,
                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <Plus size={19} color="#FFFFFF" strokeWidth={2.7} />
              </Pressable>
            </View>
          </View>

          <Text className="mt-2 text-[11px] leading-[17px] text-ink-secondary">
            Manage drivers, dispatchers, and administrators.
          </Text>

          {/* =====================================================
              SEARCH
          ====================================================== */}

          <View className="mt-5 flex-row items-center rounded-[20px] border border-white/90 bg-clay-surface px-4">
            <Search size={18} color="#64748B" strokeWidth={2.2} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search staff, email, plate, or jeepney"
              placeholderTextColor="#94A3B8"
              className="ml-3 flex-1 py-4 text-[12px] font-medium text-ink-dark"
            />

            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <XCircle size={18} color="#94A3B8" strokeWidth={2.2} />
              </Pressable>
            )}
          </View>

          {/* =====================================================
              FILTERS
          ====================================================== */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
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

          {/* =====================================================
              ERROR
          ====================================================== */}

          {error && (
            <View className="mt-5 rounded-[24px] border border-red-100 bg-white/90 p-5">
              <View className="flex-row items-center">
                <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-red-50">
                  <AlertTriangle size={21} color="#DC2626" strokeWidth={2.4} />
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-extrabold text-ink-dark">
                    Staff unavailable
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

          {/* =====================================================
              DIRECTORY
          ====================================================== */}

          <View className="mb-3 mt-7">
            <Text className="text-[16px] font-extrabold text-ink-dark">
              Staff Directory
            </Text>

            <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
              {filteredStaff.length} staff shown
            </Text>
          </View>

          {filteredStaff.length === 0 ? (
            <EmptyStaff search={search} />
          ) : (
            <View>
              {filteredStaff.map((member) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  onPress={() =>
                    router.push(`/staff/(admin)/staffs/${member.id}`)
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* =====================================================
            ADD STAFF MODAL
        ====================================================== */}

        <AddStaffModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateStaff}
        />

        {/* =====================================================
            SUCCESS MODAL
        ====================================================== */}

        <StaffCreatedSuccessModal
          visible={showSuccessModal}
          staffName={createdStaffName}
          onClose={() => {
            setShowSuccessModal(false);
            setCreatedStaffName("");
          }}
        />
      </SafeAreaView>
    </OceanBackground>
  );
}

/* =========================================================
   ADD STAFF MODAL
========================================================= */

function AddStaffModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStaffData) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] = useState<AdminStaffRole>("driver");

  const [terminal, setTerminal] = useState("");
  const [bracket, setBracket] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);

  const reset = () => {
    setDisplayName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setRole("driver");
    setTerminal("");
    setBracket("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setValidationError(null);
    setSaving(false);
  };

  const close = () => {
    if (saving) {
      return;
    }

    reset();
    onClose();
  };

  const validate = (): string | null => {
    const name = displayName.trim();
    const emailValue = email.trim();
    const phoneValue = phone.trim();

    if (!name) {
      return "Display name is required.";
    }

    if (name.length < 2) {
      return "Display name must be at least 2 characters.";
    }

    if (name.length > 100) {
      return "Display name must not exceed 100 characters.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValue) {
      return "Email is required.";
    }

    if (!emailRegex.test(emailValue)) {
      return "Please enter a valid email address.";
    }

    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (!/[A-Z]/.test(password)) {
      return "Password must contain an uppercase letter.";
    }

    if (!/[a-z]/.test(password)) {
      return "Password must contain a lowercase letter.";
    }

    if (!/[0-9]/.test(password)) {
      return "Password must contain a number.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    if (phoneValue) {
      const normalized = phoneValue.replace(/[\s()-]/g, "");

      if (!/^\+?[0-9]{10,15}$/.test(normalized)) {
        return "Please enter a valid phone number.";
      }
    }

    if (terminal.trim()) {
      const value = Number(terminal);

      if (!Number.isInteger(value) || value < 1) {
        return "Preferred terminal must be a positive whole number.";
      }
    }

    if (bracket.trim()) {
      const value = Number(bracket);

      if (!Number.isInteger(value) || value < 1) {
        return "Preferred bracket must be a positive whole number.";
      }
    }

    return null;
  };

  const submit = async () => {
    setValidationError(null);

    const error = validate();

    if (error) {
      setValidationError(error);
      return;
    }

    try {
      setSaving(true);

      await onSubmit({
        display_name: displayName.trim(),

        email: email.trim().toLowerCase(),

        password,

        phone_number: phone.trim() || null,

        role,

        preferred_terminal: terminal.trim() ? Number(terminal) : null,

        preferred_bracket: bracket.trim() ? Number(bracket) : null,

        jeepney_id: null,
      });

      reset();
    } catch {
      // Parent handles creation error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-slate-900/35">
          <View className="max-h-[92%] rounded-t-[32px] border border-white/90 bg-clay-surface">
            {/* HEADER */}

            <View className="flex-row items-center border-b border-slate-200/50 px-5 py-4">
              <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-ocean-100">
                <Plus size={21} color={colors.primaryDark} strokeWidth={2.5} />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[16px] font-extrabold text-ink-dark">
                  Add Staff
                </Text>

                <Text className="mt-0.5 text-[10px] text-ink-secondary">
                  Create a new staff login account.
                </Text>
              </View>

              <Pressable
                onPress={close}
                disabled={saving}
                className="h-[40px] w-[40px] items-center justify-center rounded-full bg-white/70"
              >
                <X size={19} color="#64748B" strokeWidth={2.4} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: 20,
                paddingBottom: 35,
              }}
            >
              {validationError && (
                <View className="mb-4 rounded-[18px] border border-red-100 bg-red-50 p-4">
                  <Text className="text-[11px] font-extrabold text-red-700">
                    Check your input
                  </Text>

                  <Text className="mt-1 text-[10px] leading-[16px] text-red-600">
                    {validationError}
                  </Text>
                </View>
              )}

              <ModalField
                label="Display Name"
                icon={<UserRound size={16} color="#64748B" strokeWidth={2.2} />}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Juan Dela Cruz"
              />

              <ModalField
                label="Email"
                icon={<Mail size={16} color="#64748B" strokeWidth={2.2} />}
                value={email}
                onChangeText={setEmail}
                placeholder="staff@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <ModalField
                label="Phone Number"
                icon={<Phone size={16} color="#64748B" strokeWidth={2.2} />}
                value={phone}
                onChangeText={setPhone}
                placeholder="+639XXXXXXXXX"
                keyboardType="phone-pad"
              />

              <PasswordField
                label="Password"
                value={password}
                onChangeText={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                placeholder="Minimum 8 characters"
              />

              <PasswordField
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                placeholder="Re-enter password"
              />

              <Text className="mb-2 mt-5 text-[10px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
                Staff Role
              </Text>

              <View className="flex-row flex-wrap">
                {(["driver", "dispatcher", "admin"] as AdminStaffRole[]).map(
                  (item) => {
                    const selected = role === item;

                    return (
                      <Pressable
                        key={item}
                        onPress={() => setRole(item)}
                        className={`mr-2 mb-2 rounded-full px-4 py-2.5 ${
                          selected ? "bg-ocean-400" : "bg-slate-100"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-extrabold ${
                            selected ? "text-white" : "text-ink-secondary"
                          }`}
                        >
                          {formatRole(item)}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              <View className="mt-2 rounded-[18px] bg-ocean-50/70 p-4">
                <Text className="text-[10px] font-extrabold text-ocean-700">
                  Login information
                </Text>

                <Text className="mt-1 text-[9px] leading-[15px] text-ink-secondary">
                  This email and password will be used for the staff member's
                  Supabase Auth login.
                </Text>
              </View>

              <ModalField
                label="Preferred Terminal"
                icon={
                  <ShieldCheck size={16} color="#64748B" strokeWidth={2.2} />
                }
                value={terminal}
                onChangeText={setTerminal}
                placeholder="Optional"
                keyboardType="numeric"
              />

              <ModalField
                label="Preferred Bracket"
                icon={<Users size={16} color="#64748B" strokeWidth={2.2} />}
                value={bracket}
                onChangeText={setBracket}
                placeholder="Optional"
                keyboardType="numeric"
              />

              {/* ACTIONS */}

              <View className="mt-6 flex-row">
                <Pressable
                  onPress={close}
                  disabled={saving}
                  className="flex-1 items-center justify-center rounded-full bg-slate-100 py-3.5"
                >
                  <Text className="text-[11px] font-extrabold text-ink-secondary">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={submit}
                  disabled={saving}
                  className="ml-2 flex-1 flex-row items-center justify-center rounded-full bg-ocean-400 py-3.5"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />

                      <Text className="ml-2 text-[11px] font-extrabold text-white">
                        Create Staff
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* =========================================================
   SUCCESS MODAL
========================================================= */

function StaffCreatedSuccessModal({
  visible,
  staffName,
  onClose,
}: {
  visible: boolean;
  staffName: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-slate-900/35 px-6">
        <View
          className="w-full max-w-[390px] rounded-[32px] border border-white/90 bg-clay-surface p-6"
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 12,
            },
            shadowOpacity: 0.12,
            shadowRadius: 28,
            elevation: 10,
          }}
        >
          {/* SUCCESS ICON */}

          <View className="items-center">
            <View
              className="h-[78px] w-[78px] items-center justify-center rounded-[27px] bg-emerald-50"
              style={{
                shadowColor: "#10B981",
                shadowOffset: {
                  width: 0,
                  height: 5,
                },
                shadowOpacity: 0.08,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View className="h-[60px] w-[60px] items-center justify-center rounded-[21px] bg-emerald-100">
                <CheckCircle2 size={33} color="#059669" strokeWidth={2.4} />
              </View>
            </View>

            <Text className="mt-5 text-center text-[20px] font-extrabold text-ink-dark">
              Staff Created
            </Text>

            <Text className="mt-2 text-center text-[12px] leading-[19px] text-ink-secondary">
              The staff account has been successfully created and is ready to
              use.
            </Text>
          </View>

          {/* STAFF INFORMATION */}

          <View className="mt-5 rounded-[22px] border border-white/90 bg-white/60 p-4">
            <View className="flex-row items-center">
              <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-ocean-100">
                <UserRound
                  size={20}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[9px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
                  Staff Account
                </Text>

                <Text
                  numberOfLines={1}
                  className="mt-0.5 text-[13px] font-extrabold text-ink-dark"
                >
                  {staffName || "New Staff"}
                </Text>
              </View>
            </View>
          </View>

          {/* LOGIN INFORMATION */}

          <View className="mt-3 rounded-[22px] bg-ocean-50/70 p-4">
            <View className="flex-row items-center">
              <ShieldCheck
                size={16}
                color={colors.primaryDark}
                strokeWidth={2.3}
              />

              <Text className="ml-2 text-[10px] font-extrabold text-ocean-700">
                Login Ready
              </Text>
            </View>

            <Text className="mt-1.5 text-[9px] leading-[15px] text-ink-secondary">
              The staff member can now sign in using the email and password
              assigned during account creation.
            </Text>
          </View>

          {/* DONE */}

          <Pressable
            onPress={onClose}
            className="mt-5 h-[50px] items-center justify-center rounded-full bg-ocean-400"
            style={{
              shadowColor: colors.primaryDark,
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text className="text-[12px] font-extrabold text-white">Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* =========================================================
   MODAL FIELD
========================================================= */

function ModalField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "numeric" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
        {label}
      </Text>

      <View className="flex-row items-center rounded-[17px] border border-white/90 bg-white/60 px-4">
        {icon}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          className="ml-3 flex-1 py-3.5 text-[12px] font-semibold text-ink-dark"
        />
      </View>
    </View>
  );
}

/* =========================================================
   PASSWORD FIELD
========================================================= */

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggle,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
        {label}
      </Text>

      <View className="flex-row items-center rounded-[17px] border border-white/90 bg-white/60 px-4">
        <ShieldCheck size={16} color="#64748B" strokeWidth={2.2} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={!visible}
          autoCapitalize="none"
          className="ml-3 flex-1 py-3.5 text-[12px] font-semibold text-ink-dark"
        />

        <Pressable
          onPress={onToggle}
          className="ml-2 h-[32px] w-[32px] items-center justify-center rounded-full bg-white/70"
        >
          {visible ? (
            <EyeOff size={16} color="#64748B" strokeWidth={2.2} />
          ) : (
            <Eye size={16} color="#64748B" strokeWidth={2.2} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   STAFF CARD
========================================================= */

function StaffCard({
  member,
  onPress,
}: {
  member: AdminStaffRecord;
  onPress: () => void;
}) {
  const role = getRolePresentation(member.role);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-[25px] border border-white/90 bg-clay-surface p-5"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.045,
        shadowRadius: 9,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center">
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-ocean-100">
          <UserRound size={24} color={colors.primaryDark} strokeWidth={2.3} />
        </View>

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-[14px] font-extrabold text-ink-dark"
          >
            {member.display_name || "Unnamed Staff"}
          </Text>

          <Text
            numberOfLines={1}
            className="mt-0.5 text-[10px] font-medium text-ink-secondary"
          >
            {member.email || "No email"}
          </Text>
        </View>

        <View
          className="rounded-full px-3 py-1.5"
          style={{
            backgroundColor: role.background,
          }}
        >
          <Text
            className="text-[9px] font-extrabold uppercase"
            style={{
              color: role.color,
            }}
          >
            {role.label}
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row">
        <InfoBlock
          icon={<Mail size={14} color="#64748B" strokeWidth={2.3} />}
          label="Email"
          value={member.email || "No email"}
        />

        <InfoBlock
          icon={<Phone size={14} color="#64748B" strokeWidth={2.3} />}
          label="Phone"
          value={member.phone_number || "No phone"}
        />
      </View>

      {member.role === "driver" && (
        <View className="mt-4 rounded-[17px] bg-slate-50/80 px-4 py-3">
          <View className="flex-row items-center">
            <ShieldCheck size={14} color="#64748B" strokeWidth={2.2} />

            <Text className="ml-2 text-[9px] font-extrabold uppercase tracking-[0.5px] text-ink-muted">
              Jeepney Assignment
            </Text>
          </View>

          <Text className="mt-1 text-[11px] font-extrabold text-ink-dark">
            {member.jeepney_name ||
              member.jeepney_plate_number ||
              "No jeepney assigned"}
          </Text>

          {member.jeepney_name && member.jeepney_plate_number && (
            <Text className="mt-0.5 text-[10px] text-ink-secondary">
              {member.jeepney_plate_number}
            </Text>
          )}
        </View>
      )}

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className={`h-2 w-2 rounded-full ${
              member.is_active ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />

          <Text className="ml-2 text-[10px] font-semibold text-ink-secondary">
            {member.is_active
              ? "Active staff account"
              : "Inactive staff account"}
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

/* =========================================================
   INFO
========================================================= */

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

/* =========================================================
   EMPTY
========================================================= */

function EmptyStaff({ search }: { search: string }) {
  return (
    <View className="items-center rounded-[25px] border border-white/90 bg-white/70 px-6 py-8">
      <View className="h-[54px] w-[54px] items-center justify-center rounded-[17px] bg-ocean-100">
        <Users size={24} color={colors.primaryDark} strokeWidth={2.3} />
      </View>

      <Text className="mt-3 text-[14px] font-extrabold text-ink-dark">
        {search ? "No staff found" : "No staff available"}
      </Text>

      <Text className="mt-1 max-w-[280px] text-center text-[10px] leading-[16px] text-ink-secondary">
        {search
          ? "Try searching with another name, email, plate number, or jeepney."
          : "There are currently no drivers, dispatchers, or administrators."}
      </Text>
    </View>
  );
}

/* =========================================================
   ROLE
========================================================= */

function formatRole(role: AdminStaffRole) {
  switch (role) {
    case "driver":
      return "Driver";

    case "dispatcher":
      return "Dispatcher";

    case "admin":
      return "Administrator";

    default:
      return "Staff";
  }
}

function getRolePresentation(role: AdminStaffRole) {
  switch (role) {
    case "driver":
      return {
        label: "Driver",
        background: "#DBEAFE",
        color: "#0369A1",
      };

    case "dispatcher":
      return {
        label: "Dispatcher",
        background: "#FEF3C7",
        color: "#B45309",
      };

    case "admin":
      return {
        label: "Admin",
        background: "#EDE9FE",
        color: "#6D28D9",
      };

    default:
      return {
        label: "Staff",
        background: "#F1F5F9",
        color: "#64748B",
      };
  }
}
