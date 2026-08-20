import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  AtSign,
  BusFront,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OceanBackground from "@/src/shared/components/clay/OceanBackground";
import { colors } from "@/src/shared/constants/theme";
import {
  AdminStaffRole,
  useAdminStaff,
} from "@/src/shared/hooks/admin/useAdminStaff";

type ModalType =
  "activate" | "deactivate" | "delete" | "success" | "error" | null;

export default function AdminStaffDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id: string;
  }>();

  const staffId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { staff, loading, error, updateStaff, toggleStaffActive, deleteStaff } =
    useAdminStaff();

  const member = useMemo(
    () => staff.find((item) => item.id === staffId) ?? null,
    [staff, staffId],
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState<AdminStaffRole>("driver");
  const [preferredTerminal, setPreferredTerminal] = useState("");
  const [preferredBracket, setPreferredBracket] = useState("");

  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    if (!member) {
      return;
    }

    setDisplayName(member.display_name);
    setPhoneNumber(member.phone_number ?? "");
    setRole(member.role);

    setPreferredTerminal(
      member.preferred_terminal == null
        ? ""
        : String(member.preferred_terminal),
    );

    setPreferredBracket(
      member.preferred_bracket == null ? "" : String(member.preferred_bracket),
    );
  }, [member]);

  const resetForm = () => {
    if (!member) {
      return;
    }

    setDisplayName(member.display_name);
    setPhoneNumber(member.phone_number ?? "");
    setRole(member.role);

    setPreferredTerminal(
      member.preferred_terminal == null
        ? ""
        : String(member.preferred_terminal),
    );

    setPreferredBracket(
      member.preferred_bracket == null ? "" : String(member.preferred_bracket),
    );
  };

  /*
   * ---------------------------------------------------------
   * MODAL HELPERS
   * ---------------------------------------------------------
   */

  const closeModal = () => {
    if (saving || deleting) {
      return;
    }

    setModalType(null);
    setModalTitle("");
    setModalMessage("");
  };

  const showModal = (type: ModalType, title: string, message: string) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
  };

  /*
   * ---------------------------------------------------------
   * SAVE
   * ---------------------------------------------------------
   */

  const handleSave = async () => {
    if (!member || saving) {
      return;
    }

    const trimmedName = displayName.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedTerminal = preferredTerminal.trim();
    const trimmedBracket = preferredBracket.trim();

    if (!trimmedName) {
      showModal(
        "error",
        "Missing name",
        "Please enter the staff member's display name.",
      );
      return;
    }

    const terminalNumber =
      trimmedTerminal === "" ? null : Number(trimmedTerminal);

    const bracketNumber = trimmedBracket === "" ? null : Number(trimmedBracket);

    if (
      terminalNumber !== null &&
      (!Number.isFinite(terminalNumber) || terminalNumber < 0)
    ) {
      showModal(
        "error",
        "Invalid terminal",
        "Preferred Terminal must be a valid number.",
      );
      return;
    }

    if (
      bracketNumber !== null &&
      (!Number.isFinite(bracketNumber) || bracketNumber < 0)
    ) {
      showModal(
        "error",
        "Invalid bracket",
        "Preferred Bracket must be a valid number.",
      );
      return;
    }

    try {
      setSaving(true);

      /*
       * IMPORTANT:
       * Send the actual values to the hook.
       * Do not close the editor until this succeeds.
       */
      await updateStaff(member.id, {
        display_name: trimmedName,
        phone_number: trimmedPhone || null,
        role,
        preferred_terminal: terminalNumber,
        preferred_bracket: bracketNumber,
      });

      setEditing(false);

      showModal(
        "success",
        "Changes saved",
        "The staff information has been successfully updated.",
      );
    } catch (err: any) {
      console.error("❌ Staff update failed:", err);

      showModal(
        "error",
        "Update failed",
        err?.message ||
          "Unable to update this staff member. Please check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * ACTIVE / INACTIVE
   * ---------------------------------------------------------
   */

  const openToggleModal = () => {
    if (!member) {
      return;
    }

    if (member.is_active) {
      showModal(
        "deactivate",
        "Deactivate staff?",
        "This staff profile will be marked as inactive and will no longer be treated as an active staff member.",
      );
    } else {
      showModal(
        "activate",
        "Activate staff?",
        "This staff profile will be marked as active again.",
      );
    }
  };

  const confirmToggleActive = async () => {
    if (!member) {
      return;
    }

    const nextState = !member.is_active;

    closeModal();

    try {
      await toggleStaffActive(member.id, nextState);

      showModal(
        "success",
        nextState ? "Staff activated" : "Staff deactivated",
        nextState
          ? "The staff profile is now active."
          : "The staff profile is now inactive.",
      );
    } catch (err: any) {
      console.error("❌ Staff status update failed:", err);

      showModal(
        "error",
        "Action failed",
        err?.message || "Unable to change the account status.",
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * DELETE
   * ---------------------------------------------------------
   */

  const openDeleteModal = () => {
    if (!member || deleting) {
      return;
    }

    showModal(
      "delete",
      "Delete staff profile?",
      "This removes the staff profile from the public users table. The Supabase Auth account will not be deleted.",
    );
  };

  const confirmDelete = async () => {
    if (!member || deleting) {
      return;
    }

    try {
      setDeleting(true);

      const success = await deleteStaff(member.id);

      if (!success) {
        throw new Error("The staff profile could not be deleted.");
      }

      closeModal();

      /*
       * Give the delete operation a moment to complete before
       * returning to the staff management screen.
       */
      router.back();
    } catch (err: any) {
      console.error("❌ Staff delete failed:", err);

      setDeleting(false);

      showModal(
        "error",
        "Delete failed",
        err?.message || "Unable to delete the staff profile.",
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <OceanBackground intensity={0.25}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center">
            <View
              className="h-[70px] w-[70px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface"
              style={clayShadow()}
            >
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
              Loading staff profile...
            </Text>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  /*
   * ---------------------------------------------------------
   * NOT FOUND
   * ---------------------------------------------------------
   */

  if (!member) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-5 pt-4">
            <Pressable
              onPress={() => router.back()}
              className="h-[44px] w-[44px] items-center justify-center rounded-full border border-white/90 bg-clay-surface"
              style={clayShadow()}
            >
              <ArrowLeft size={20} color="#475569" strokeWidth={2.4} />
            </Pressable>

            <View
              className="mt-10 items-center rounded-[26px] border border-white/90 bg-clay-surface px-6 py-10"
              style={clayShadow()}
            >
              <View className="h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-red-50">
                <AlertTriangle size={25} color="#DC2626" strokeWidth={2.3} />
              </View>

              <Text className="mt-4 text-[16px] font-extrabold text-ink-dark">
                Staff member not found
              </Text>

              <Text className="mt-1 text-center text-[11px] leading-[17px] text-ink-secondary">
                {error ?? "This staff profile may have been removed."}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </OceanBackground>
    );
  }

  const rolePresentation = getRolePresentation(member.role);

  return (
    <OceanBackground intensity={0.28}>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 150,
          }}
        >
          {/* HEADER */}

          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="h-[44px] w-[44px] items-center justify-center rounded-full border border-white/90 bg-clay-surface"
              style={clayShadow()}
            >
              <ArrowLeft size={20} color="#475569" strokeWidth={2.4} />
            </Pressable>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-ocean-700">
                STAFF MANAGEMENT
              </Text>

              <Text className="mt-0.5 text-[21px] font-extrabold text-ink-dark">
                Staff Details
              </Text>
            </View>

            {!editing && (
              <Pressable
                onPress={() => setEditing(true)}
                className="rounded-full bg-ocean-400 px-4 py-2.5"
              >
                <Text className="text-[10px] font-extrabold text-white">
                  Edit
                </Text>
              </Pressable>
            )}
          </View>

          {/* PROFILE */}

          <View
            className="mt-5 rounded-[27px] border border-white/90 bg-clay-surface p-5"
            style={clayShadow()}
          >
            <View className="flex-row items-center">
              <View className="h-[68px] w-[68px] items-center justify-center rounded-[21px] bg-ocean-100">
                <UserRound
                  size={31}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>

              <View className="ml-4 flex-1">
                <Text className="text-[18px] font-extrabold text-ink-dark">
                  {member.display_name}
                </Text>

                <Text className="mt-1 text-[11px] text-ink-secondary">
                  {member.email || "No email"}
                </Text>

                <View className="mt-2 flex-row items-center">
                  <View
                    className="rounded-full px-3 py-1.5"
                    style={{
                      backgroundColor: rolePresentation.background,
                    }}
                  >
                    <Text
                      className="text-[9px] font-extrabold uppercase"
                      style={{
                        color: rolePresentation.color,
                      }}
                    >
                      {rolePresentation.label}
                    </Text>
                  </View>

                  <View
                    className={`ml-2 rounded-full px-3 py-1.5 ${
                      member.is_active ? "bg-emerald-50" : "bg-slate-100"
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-extrabold ${
                        member.is_active ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      {member.is_active ? "ACTIVE" : "INACTIVE"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* EDIT */}

          {editing ? (
            <>
              <SectionTitle title="Edit Information" />

              <View
                className="rounded-[25px] border border-white/90 bg-clay-surface p-5"
                style={clayShadow()}
              >
                <Field
                  label="Display Name"
                  icon={
                    <UserRound size={16} color="#64748B" strokeWidth={2.2} />
                  }
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Staff name"
                />

                <Field
                  label="Phone Number"
                  icon={<Phone size={16} color="#64748B" strokeWidth={2.2} />}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />

                <Text className="mb-2 mt-5 text-[10px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
                  Role
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

                <Field
                  label="Preferred Terminal"
                  icon={<MapPin size={16} color="#64748B" strokeWidth={2.2} />}
                  value={preferredTerminal}
                  onChangeText={setPreferredTerminal}
                  placeholder="Terminal number"
                  keyboardType="numeric"
                />

                <Field
                  label="Preferred Bracket"
                  icon={<Users size={16} color="#64748B" strokeWidth={2.2} />}
                  value={preferredBracket}
                  onChangeText={setPreferredBracket}
                  placeholder="Bracket number"
                  keyboardType="numeric"
                />

                <View className="mt-5 flex-row">
                  <Pressable
                    onPress={() => {
                      resetForm();
                      setEditing(false);
                    }}
                    disabled={saving}
                    className="flex-1 flex-row items-center justify-center rounded-full bg-slate-100 py-3.5"
                  >
                    <X size={16} color="#64748B" strokeWidth={2.3} />

                    <Text className="ml-2 text-[11px] font-extrabold text-ink-secondary">
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSave}
                    disabled={saving}
                    className="ml-2 flex-1 flex-row items-center justify-center rounded-full bg-ocean-400 py-3.5"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Save size={16} color="#FFFFFF" strokeWidth={2.3} />

                        <Text className="ml-2 text-[11px] font-extrabold text-white">
                          Save Changes
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* ACCOUNT INFORMATION */}

              <SectionTitle title="Account Information" />

              <View
                className="rounded-[25px] border border-white/90 bg-clay-surface p-5"
                style={clayShadow()}
              >
                <DetailRow
                  icon={<AtSign size={17} color="#64748B" strokeWidth={2.2} />}
                  label="Email"
                  value={member.email || "No email"}
                />

                <DetailRow
                  icon={<Phone size={17} color="#64748B" strokeWidth={2.2} />}
                  label="Phone"
                  value={member.phone_number || "No phone number"}
                />

                <DetailRow
                  icon={
                    <ShieldCheck size={17} color="#64748B" strokeWidth={2.2} />
                  }
                  label="Role"
                  value={formatRole(member.role)}
                />

                <DetailRow
                  icon={
                    <CheckCircle2
                      size={17}
                      color={member.is_active ? "#059669" : "#64748B"}
                      strokeWidth={2.2}
                    />
                  }
                  label="Account Status"
                  value={member.is_active ? "Active" : "Inactive"}
                />
              </View>

              {/* WORK INFORMATION */}

              <SectionTitle title="Work Information" />

              <View
                className="rounded-[25px] border border-white/90 bg-clay-surface p-5"
                style={clayShadow()}
              >
                <DetailRow
                  icon={
                    <BusFront size={17} color="#64748B" strokeWidth={2.2} />
                  }
                  label="Assigned Jeepney"
                  value={
                    member.jeepney_name ||
                    member.jeepney_plate_number ||
                    "No jeepney assigned"
                  }
                />

                {member.jeepney_name && member.jeepney_plate_number && (
                  <DetailRow
                    icon={
                      <BusFront size={17} color="#64748B" strokeWidth={2.2} />
                    }
                    label="Plate Number"
                    value={member.jeepney_plate_number}
                  />
                )}

                <DetailRow
                  icon={<MapPin size={17} color="#64748B" strokeWidth={2.2} />}
                  label="Preferred Terminal"
                  value={
                    member.preferred_terminal == null
                      ? "Not set"
                      : `Terminal ${member.preferred_terminal}`
                  }
                />

                <DetailRow
                  icon={<Users size={17} color="#64748B" strokeWidth={2.2} />}
                  label="Preferred Bracket"
                  value={
                    member.preferred_bracket == null
                      ? "Not set"
                      : String(member.preferred_bracket)
                  }
                />
              </View>

              {/* SYSTEM INFORMATION */}

              <SectionTitle title="System Information" />

              <View
                className="rounded-[25px] border border-white/90 bg-clay-surface p-5"
                style={clayShadow()}
              >
                <DetailRow
                  icon={<Mail size={17} color="#64748B" strokeWidth={2.2} />}
                  label="FCM Token"
                  value={member.fcm_token ? "Registered" : "Not registered"}
                />

                <DetailRow
                  icon={<Phone size={17} color="#64748B" strokeWidth={2.2} />}
                  label="Expo Push Token"
                  value={
                    member.expo_push_token ? "Registered" : "Not registered"
                  }
                />

                <DetailRow
                  icon={
                    <ShieldCheck size={17} color="#64748B" strokeWidth={2.2} />
                  }
                  label="Push Type"
                  value={member.push_token_type ?? "Not configured"}
                />

                <DetailRow
                  icon={<Users size={17} color="#64748B" strokeWidth={2.2} />}
                  label="Staff ID"
                  value={member.id}
                />

                <DetailRow
                  icon={
                    <CheckCircle2 size={17} color="#64748B" strokeWidth={2.2} />
                  }
                  label="Created"
                  value={formatDate(member.created_at)}
                />

                <DetailRow
                  icon={
                    <CheckCircle2 size={17} color="#64748B" strokeWidth={2.2} />
                  }
                  label="Last Updated"
                  value={formatDate(member.updated_at)}
                />
              </View>

              {/* ACCOUNT ACTIONS */}

              <SectionTitle title="Account Actions" />

              <View
                className="rounded-[25px] border border-white/90 bg-clay-surface p-5"
                style={clayShadow()}
              >
                <Pressable
                  onPress={openToggleModal}
                  className={`flex-row items-center rounded-[18px] px-4 py-4 ${
                    member.is_active ? "bg-amber-50" : "bg-emerald-50"
                  }`}
                >
                  <View
                    className={`h-[40px] w-[40px] items-center justify-center rounded-[13px] ${
                      member.is_active ? "bg-amber-100" : "bg-emerald-100"
                    }`}
                  >
                    {member.is_active ? (
                      <X size={19} color="#B45309" strokeWidth={2.4} />
                    ) : (
                      <CheckCircle2
                        size={19}
                        color="#047857"
                        strokeWidth={2.4}
                      />
                    )}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[12px] font-extrabold text-ink-dark">
                      {member.is_active ? "Deactivate Staff" : "Activate Staff"}
                    </Text>

                    <Text className="mt-0.5 text-[10px] leading-[15px] text-ink-secondary">
                      {member.is_active
                        ? "Prevent this staff profile from being treated as active."
                        : "Mark this staff profile as active again."}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={openDeleteModal}
                  disabled={deleting}
                  className="mt-3 flex-row items-center rounded-[18px] bg-red-50 px-4 py-4"
                >
                  <View className="h-[40px] w-[40px] items-center justify-center rounded-[13px] bg-red-100">
                    {deleting ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Trash2 size={19} color="#DC2626" strokeWidth={2.4} />
                    )}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[12px] font-extrabold text-red-700">
                      Delete Staff Profile
                    </Text>

                    <Text className="mt-0.5 text-[10px] leading-[15px] text-red-600">
                      Removes the public staff record. Auth account is not
                      deleted.
                    </Text>
                  </View>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* =====================================================
          CLAY MORPHISM MODAL
          ===================================================== */}

      <ClayModal
        visible={modalType !== null}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        loading={saving || deleting}
        onClose={closeModal}
        onConfirm={
          modalType === "delete"
            ? confirmDelete
            : modalType === "activate" || modalType === "deactivate"
              ? confirmToggleActive
              : closeModal
        }
      />
    </OceanBackground>
  );
}

/* ============================================================
   CLAY MODAL
   ============================================================ */

function ClayModal({
  visible,
  type,
  title,
  message,
  loading,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!type) {
    return null;
  }

  const isDanger =
    type === "delete" || type === "deactivate" || type === "error";

  const isSuccess = type === "success";

  const isConfirm =
    type === "delete" || type === "activate" || type === "deactivate";

  const iconBackground = isDanger
    ? "#FEE2E2"
    : isSuccess
      ? "#D1FAE5"
      : "#E0F2FE";

  const iconColor = isDanger ? "#DC2626" : isSuccess ? "#047857" : "#0369A1";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={loading ? undefined : onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/30 px-5">
        <View
          className="w-full max-w-[390px] overflow-hidden rounded-[30px] border border-white/95 bg-clay-surface"
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 12,
            },
            shadowOpacity: 0.16,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* CLAY HIGHLIGHT */}

          <View
            pointerEvents="none"
            className="absolute left-[24px] right-[24px] top-[1px] h-[3px] rounded-full bg-white/95"
          />

          <View className="p-6">
            {/* ICON */}

            <View className="items-center">
              <View
                className="h-[62px] w-[62px] items-center justify-center rounded-[20px]"
                style={{
                  backgroundColor: iconBackground,
                }}
              >
                {isDanger ? (
                  <AlertTriangle
                    size={28}
                    color={iconColor}
                    strokeWidth={2.3}
                  />
                ) : isSuccess ? (
                  <CheckCircle2 size={29} color={iconColor} strokeWidth={2.3} />
                ) : (
                  <ShieldCheck size={29} color={iconColor} strokeWidth={2.3} />
                )}
              </View>

              <Text className="mt-4 text-center text-[17px] font-extrabold text-ink-dark">
                {title}
              </Text>

              <Text className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary">
                {message}
              </Text>
            </View>

            {/* CONFIRM BUTTONS */}

            {isConfirm ? (
              <View className="mt-6 flex-row">
                <Pressable
                  onPress={onClose}
                  disabled={loading}
                  className="flex-1 items-center justify-center rounded-full bg-slate-100 py-3.5"
                >
                  <Text className="text-[11px] font-extrabold text-ink-secondary">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onConfirm}
                  disabled={loading}
                  className={`ml-2 flex-1 flex-row items-center justify-center rounded-full py-3.5 ${
                    isDanger ? "bg-red-500" : "bg-ocean-400"
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      {type === "delete" ? (
                        <Trash2 size={15} color="#FFFFFF" strokeWidth={2.4} />
                      ) : type === "deactivate" ? (
                        <X size={15} color="#FFFFFF" strokeWidth={2.5} />
                      ) : (
                        <CheckCircle2
                          size={15}
                          color="#FFFFFF"
                          strokeWidth={2.5}
                        />
                      )}

                      <Text className="ml-2 text-[11px] font-extrabold text-white">
                        {type === "delete"
                          ? "Delete"
                          : type === "deactivate"
                            ? "Deactivate"
                            : "Activate"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={onClose}
                className="mt-6 items-center justify-center rounded-full bg-ocean-400 py-3.5"
              >
                <Text className="text-[11px] font-extrabold text-white">
                  Done
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================
   SECTION TITLE
   ============================================================ */

function SectionTitle({ title }: { title: string }) {
  return (
    <View className="mb-2 mt-6 px-1">
      <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-ocean-700">
        {title}
      </Text>
    </View>
  );
}

/* ============================================================
   FIELD
   ============================================================ */

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "numeric";
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
          className="ml-3 flex-1 py-3.5 text-[12px] font-semibold text-ink-dark"
        />
      </View>
    </View>
  );
}

/* ============================================================
   DETAIL ROW
   ============================================================ */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start border-b border-slate-200/50 py-3.5">
      <View className="h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-slate-100">
        {icon}
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[9px] font-extrabold uppercase tracking-[0.5px] text-ink-muted">
          {label}
        </Text>

        <Text
          selectable
          className="mt-1 text-[11px] font-extrabold leading-[17px] text-ink-dark"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   CLAY SHADOW
   ============================================================ */

function clayShadow() {
  return {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.045,
    shadowRadius: 9,
    elevation: 2,
  };
}

/* ============================================================
   ROLE
   ============================================================ */

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

/* ============================================================
   DATE
   ============================================================ */

function formatDate(value: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
