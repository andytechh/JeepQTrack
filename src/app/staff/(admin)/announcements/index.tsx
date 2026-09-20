import { router } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
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
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementPriority,
  useAnnouncements,
} from "@/src/shared/hooks/admin/useAnnouncements";

type Filter = "all" | AnnouncementAudience;

const CATEGORY_OPTIONS: {
  value: AnnouncementCategory;
  label: string;
}[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "terminal", label: "Terminal Notice" },
  { value: "service", label: "Service Update" },
  { value: "disruption", label: "Service Disruption" },
  { value: "system", label: "System Update" },
  { value: "policy", label: "Policy / Reminder" },
  { value: "staff", label: "Staff Notice" },
  { value: "event", label: "Event" },
  { value: "general", label: "General" },
];

const AUDIENCE_OPTIONS: {
  value: AnnouncementAudience;
  label: string;
  detail: string;
}[] = [
  {
    value: "staff",
    label: "Staff Only",
    detail: "Drivers, dispatchers and admins",
  },
  {
    value: "commuters",
    label: "Commuters Only",
    detail: "Passenger accounts",
  },
  {
    value: "all",
    label: "Everyone",
    detail: "Staff and commuters",
  },
];

const PRIORITY_OPTIONS: {
  value: AnnouncementPriority;
  label: string;
}[] = [
  { value: "normal", label: "Normal" },
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
];

export default function AdminAnnouncementsScreen() {
  const {
    announcements,
    loading,
    refreshing,
    error,
    refresh,
    createAnnouncement,
    deleteAnnouncement,
  } = useAnnouncements();

  const [filter, setFilter] = useState<Filter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return announcements;
    }

    return announcements.filter((item) => item.audience === filter);
  }, [announcements, filter]);

  const handleDelete = (id: string) => {
    setDeleteError("");
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) {
      return;
    }

    try {
      setSelectedId(deleteTargetId);
      setDeleteError("");
      await deleteAnnouncement(deleteTargetId);
      setDeleteTargetId(null);
    } catch (err: any) {
      setDeleteError(err?.message ?? "Unable to delete the announcement.");
    } finally {
      setSelectedId(null);
    }
  };

  if (loading) {
    return (
      <OceanBackground intensity={0.28}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <View
              className="h-[70px] w-[70px] items-center justify-center rounded-[24px] border border-white/90 bg-clay-surface"
              style={clayShadow()}
            >
              <ActivityIndicator size="small" color={colors.primaryDark} />
            </View>

            <Text className="mt-4 text-[14px] font-extrabold text-ink-dark">
              Loading announcements...
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
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="h-[44px] w-[44px] items-center justify-center rounded-[16px] border border-white/90 bg-clay-surface"
              style={clayShadow()}
            >
              <ArrowLeft size={20} color="#475569" strokeWidth={2.5} />
            </Pressable>

            <View className="ml-3 flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-ocean-700">
                SYSTEM
              </Text>

              <Text className="mt-0.5 text-[25px] font-extrabold text-ink-dark">
                Announcements
              </Text>
            </View>

            <Pressable
              onPress={() => setShowCreate(true)}
              className="h-[42px] w-[42px] items-center justify-center rounded-full bg-ocean-400"
              style={clayButtonShadow()}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={2.6} />
            </Pressable>
          </View>

          <View
            className="mt-5 rounded-[25px] border border-white/90 bg-clay-surface p-4"
            style={clayShadow()}
          >
            <View className="flex-row items-center">
              <View className="h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-ocean-100">
                <Megaphone
                  size={23}
                  color={colors.primaryDark}
                  strokeWidth={2.3}
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-extrabold text-ink-dark">
                  Broadcast center
                </Text>

                <Text className="mt-1 text-[10px] leading-[16px] text-ink-secondary">
                  Send operational announcements directly to staff, commuters,
                  or everyone.
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row">
              <Stat label="Total" value={announcements.length} />

              <Stat
                label="Published"
                value={
                  announcements.filter((item) => item.status === "published")
                    .length
                }
              />

              <Stat
                label="Urgent"
                value={
                  announcements.filter((item) => item.priority === "urgent")
                    .length
                }
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-5"
          >
            {(["all", "staff", "commuters"] as Filter[]).map((item) => {
              const selected = filter === item;

              const label =
                item === "all"
                  ? "All"
                  : item === "staff"
                    ? "Staff"
                    : "Commuters";

              return (
                <Pressable
                  key={item}
                  onPress={() => setFilter(item)}
                  className={`mr-2 rounded-full border px-4 py-2.5 ${
                    selected
                      ? "border-ocean-300 bg-ocean-100"
                      : "border-white/90 bg-clay-surface"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-extrabold ${
                      selected ? "text-ocean-700" : "text-ink-secondary"
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? (
            <View className="mt-5 rounded-[24px] border border-red-100 bg-red-50 p-5">
              <View className="flex-row items-center">
                <AlertTriangle size={20} color="#DC2626" strokeWidth={2.4} />

                <Text className="ml-2 flex-1 text-[12px] font-bold text-red-700">
                  {error}
                </Text>
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
          ) : null}

          <View className="mb-3 mt-7">
            <Text className="text-[16px] font-extrabold text-ink-dark">
              Announcement History
            </Text>

            <Text className="mt-0.5 text-[10px] font-medium text-ink-muted">
              {filtered.length} announcement
              {filtered.length === 1 ? "" : "s"}
            </Text>
          </View>

          {filtered.length === 0 ? (
            <EmptyAnnouncements onCreate={() => setShowCreate(true)} />
          ) : (
            filtered.map((item) => (
              <AnnouncementCard
                key={item.id}
                announcement={item}
                deleting={selectedId === item.id}
                onDelete={() => handleDelete(item.id)}
              />
            ))
          )}
        </ScrollView>

        <CreateAnnouncementModal
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          onSubmit={async (input) => {
            await createAnnouncement(input);
            setShowCreate(false);
            setShowSuccess(true);
          }}
        />

        <ClayDeleteModal
          visible={deleteTargetId !== null}
          title={
            announcements.find((item) => item.id === deleteTargetId)?.title ??
            "this announcement"
          }
          loading={selectedId !== null}
          error={deleteError}
          onCancel={() => {
            if (selectedId) {
              return;
            }
            setDeleteError("");
            setDeleteTargetId(null);
          }}
          onConfirm={confirmDelete}
        />

        <ClaySuccessModal
          visible={showSuccess}
          onClose={() => setShowSuccess(false)}
        />
      </SafeAreaView>
    </OceanBackground>
  );
}

function CreateAnnouncementModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: any) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  const reset = () => {
    setTitle("");
    setMessage("");
    setCategory("general");
    setAudience("all");
    setPriority("normal");
    setExpiresAt("");
    setError("");
    setSaving(false);
    setKeyboardHeight(0);
  };

  const close = () => {
    if (saving) {
      return;
    }

    Keyboard.dismiss();
    reset();
    onClose();
  };

  const submit = async () => {
    if (!title.trim()) {
      setError("Announcement title is required.");
      return;
    }

    if (title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }

    if (!message.trim()) {
      setError("Announcement message is required.");
      return;
    }

    if (message.trim().length < 3) {
      setError("Message must be at least 3 characters.");
      return;
    }

    let expiration: string | null = null;

    if (expiresAt.trim()) {
      const parsed = new Date(expiresAt.trim());

      if (Number.isNaN(parsed.getTime())) {
        setError("Use a valid expiration date, for example 2026-09-30.");
        return;
      }

      if (parsed.getTime() <= Date.now()) {
        setError("Expiration must be in the future.");
        return;
      }

      expiration = parsed.toISOString();
    }

    try {
      setSaving(true);
      setError("");
      Keyboard.dismiss();

      await onSubmit({
        title: title.trim(),
        message: message.trim(),
        category,
        audience,
        priority,
        expires_at: expiration,
      });

      reset();
    } catch (err: any) {
      setError(err?.message ?? "Unable to publish announcement.");
    } finally {
      setSaving(false);
    }
  };

  const screenHeight = Dimensions.get("window").height;
  const keyboardOpen = keyboardHeight > 0;
  const modalHeight = keyboardOpen
    ? Math.max(360, screenHeight - keyboardHeight - 24)
    : Math.min(Math.round(screenHeight * 0.9), 760);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View className="flex-1 bg-black/30">
        <View
          className="flex-1 items-center justify-center px-4"
          style={{
            paddingTop: keyboardOpen ? 8 : 24,
            paddingBottom: keyboardOpen ? keyboardHeight + 8 : 24,
          }}
        >
          <View
            className="w-full max-w-[520px] min-h-0 rounded-[30px] border border-white/90 bg-clay-background px-5 pb-5 pt-4"
            style={[
              modalShadow(),
              {
                height: modalHeight,
              },
            ]}
          >
            <View className="mb-4 flex-row items-center">
              <View className="h-[44px] w-[44px] items-center justify-center rounded-[15px] bg-ocean-100">
                <Megaphone
                  size={21}
                  color={colors.primaryDark}
                  strokeWidth={2.4}
                />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[18px] font-extrabold text-ink-dark">
                  Create Announcement
                </Text>
                <Text className="mt-0.5 text-[10px] text-ink-muted">
                  Publish a notification to selected users.
                </Text>
              </View>

              <Pressable
                onPress={close}
                className="h-[38px] w-[38px] items-center justify-center rounded-full bg-clay-surface"
                style={clayShadow()}
              >
                <X size={18} color="#64748B" strokeWidth={2.5} />
              </Pressable>
            </View>

            <ScrollView
              className="min-h-0 flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              contentContainerStyle={{
                paddingBottom: 18,
              }}
            >
              <Input
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. System Maintenance"
                maxLength={120}
              />

              <Text className="mb-2 mt-4 text-[10px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
                Announcement Type
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
              >
                {CATEGORY_OPTIONS.map((item) => {
                  const selected = category === item.value;

                  return (
                    <Choice
                      key={item.value}
                      selected={selected}
                      label={item.label}
                      onPress={() => setCategory(item.value)}
                    />
                  );
                })}
              </ScrollView>

              <Text className="mb-2 mt-4 text-[10px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
                Audience
              </Text>

              {AUDIENCE_OPTIONS.map((item) => {
                const selected = audience === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setAudience(item.value)}
                    className={`mb-2 flex-row items-center rounded-[18px] border p-3 ${
                      selected
                        ? "border-ocean-300 bg-ocean-50"
                        : "border-white/90 bg-clay-surface"
                    }`}
                    style={selected ? clayShadow() : undefined}
                  >
                    <View
                      className={`h-[38px] w-[38px] items-center justify-center rounded-[13px] ${
                        selected ? "bg-ocean-400" : "bg-slate-100"
                      }`}
                    >
                      {item.value === "all" ? (
                        <Bell
                          size={18}
                          color={selected ? "#FFFFFF" : "#64748B"}
                          strokeWidth={2.4}
                        />
                      ) : (
                        <Users
                          size={18}
                          color={selected ? "#FFFFFF" : "#64748B"}
                          strokeWidth={2.4}
                        />
                      )}
                    </View>

                    <View className="ml-3 flex-1">
                      <Text
                        className={`text-[12px] font-extrabold ${
                          selected ? "text-ocean-700" : "text-ink-dark"
                        }`}
                      >
                        {item.label}
                      </Text>
                      <Text className="mt-0.5 text-[9px] text-ink-muted">
                        {item.detail}
                      </Text>
                    </View>

                    {selected ? (
                      <CheckCircle2
                        size={18}
                        color={colors.primaryDark}
                        strokeWidth={2.4}
                      />
                    ) : null}
                  </Pressable>
                );
              })}

              <Text className="mb-2 mt-3 text-[10px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
                Priority
              </Text>

              <View className="flex-row">
                {PRIORITY_OPTIONS.map((item) => {
                  const selected = priority === item.value;

                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => setPriority(item.value)}
                      className={`mr-2 rounded-full border px-4 py-2.5 ${
                        selected
                          ? "border-ocean-300 bg-ocean-100"
                          : "border-white/90 bg-clay-surface"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-extrabold ${
                          selected ? "text-ocean-700" : "text-ink-secondary"
                        }`}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Input
                label="Message"
                value={message}
                onChangeText={setMessage}
                placeholder="Write the announcement..."
                multiline
                maxLength={2000}
                inputClass="min-h-[120px]"
              />

              <Input
                label="Expiration (optional)"
                value={expiresAt}
                onChangeText={setExpiresAt}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />

              {error ? (
                <View className="mt-4 rounded-[16px] border border-red-100 bg-red-50 px-4 py-3">
                  <Text className="text-[10px] font-bold leading-[16px] text-red-700">
                    {error}
                  </Text>
                </View>
              ) : null}

              <Pressable
                disabled={saving}
                onPress={submit}
                className="mt-5 h-[52px] flex-row items-center justify-center rounded-full bg-ocean-400"
                style={clayButtonShadow()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={17} color="#FFFFFF" strokeWidth={2.5} />
                )}

                <Text className="ml-2 text-[12px] font-extrabold text-white">
                  {saving ? "Publishing..." : "Publish Announcement"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ClayDeleteModal({
  visible,
  title,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/35 px-6">
        <View
          className="w-full max-w-[420px] rounded-[30px] border border-white/90 bg-clay-background p-5"
          style={modalShadow()}
        >
          <View className="items-center">
            <View className="h-[62px] w-[62px] items-center justify-center rounded-[21px] bg-red-50">
              <Trash2 size={28} color="#DC2626" strokeWidth={2.3} />
            </View>

            <Text className="mt-4 text-center text-[18px] font-extrabold text-ink-dark">
              Delete Announcement?
            </Text>

            <Text
              numberOfLines={3}
              className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary"
            >
              “{title}” will be permanently removed along with its notification
              copies.
            </Text>
          </View>

          {error ? (
            <View className="mt-4 rounded-[16px] border border-red-100 bg-red-50 px-4 py-3">
              <Text className="text-center text-[10px] font-bold leading-[16px] text-red-700">
                {error}
              </Text>
            </View>
          ) : null}

          <View className="mt-5 flex-row">
            <Pressable
              disabled={loading}
              onPress={onCancel}
              className="mr-2 h-[48px] flex-1 items-center justify-center rounded-full border border-white/90 bg-clay-surface"
              style={clayShadow()}
            >
              <Text className="text-[11px] font-extrabold text-ink-secondary">
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={onConfirm}
              className="ml-2 h-[48px] flex-1 flex-row items-center justify-center rounded-full bg-red-500"
              style={redButtonShadow()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Trash2 size={16} color="#FFFFFF" strokeWidth={2.5} />
              )}

              <Text className="ml-2 text-[11px] font-extrabold text-white">
                {loading ? "Deleting..." : "Delete"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ClaySuccessModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/35 px-6">
        <View
          className="w-full max-w-[420px] items-center rounded-[30px] border border-white/90 bg-clay-background p-6"
          style={modalShadow()}
        >
          <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-ocean-100">
            <CheckCircle2
              size={38}
              color={colors.primaryDark}
              strokeWidth={2.4}
            />
          </View>

          <Text className="mt-5 text-center text-[19px] font-extrabold text-ink-dark">
            Announcement Published
          </Text>

          <Text className="mt-2 text-center text-[11px] leading-[17px] text-ink-secondary">
            Your announcement was created successfully and the selected users
            have been notified.
          </Text>

          <Pressable
            onPress={onClose}
            className="mt-6 h-[50px] w-full flex-row items-center justify-center rounded-full bg-ocean-400"
            style={clayButtonShadow()}
          >
            <CheckCircle2 size={17} color="#FFFFFF" strokeWidth={2.5} />

            <Text className="ml-2 text-[12px] font-extrabold text-white">
              Done
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AnnouncementCard({
  announcement,
  deleting,
  onDelete,
}: {
  announcement: any;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <View
      className="mb-3 rounded-[24px] border border-white/90 bg-clay-surface p-4"
      style={clayShadow()}
    >
      <View className="flex-row">
        <View className="h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-ocean-100">
          <Megaphone size={21} color={colors.primaryDark} strokeWidth={2.3} />
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-start">
            <Text
              numberOfLines={2}
              className="flex-1 pr-2 text-[14px] font-extrabold text-ink-dark"
            >
              {announcement.title}
            </Text>

            <PriorityBadge priority={announcement.priority} />
          </View>

          <Text
            numberOfLines={3}
            className="mt-2 text-[11px] leading-[17px] text-ink-secondary"
          >
            {announcement.message}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap items-center">
        <Badge label={audienceLabel(announcement.audience)} />

        <Badge label={categoryLabel(announcement.category)} />

        <Text className="mr-3 mt-2 text-[9px] font-semibold text-ink-muted">
          {formatDate(announcement.created_at)}
        </Text>

        <Pressable
          disabled={deleting}
          onPress={onDelete}
          className="ml-auto mt-2 h-[32px] w-[32px] items-center justify-center rounded-full bg-red-50"
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Trash2 size={15} color="#DC2626" strokeWidth={2.4} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function EmptyAnnouncements({ onCreate }: { onCreate: () => void }) {
  return (
    <View
      className="items-center rounded-[25px] border border-white/90 bg-clay-surface px-6 py-9"
      style={clayShadow()}
    >
      <View className="h-[64px] w-[64px] items-center justify-center rounded-[21px] bg-ocean-100">
        <Megaphone size={27} color={colors.primaryDark} strokeWidth={2.2} />
      </View>

      <Text className="mt-4 text-[16px] font-extrabold text-ink-dark">
        No announcements yet
      </Text>

      <Text className="mt-1 max-w-[290px] text-center text-[10px] leading-[16px] text-ink-secondary">
        Create an operational notice for staff, commuters, or everyone.
      </Text>

      <Pressable
        onPress={onCreate}
        className="mt-5 h-[44px] flex-row items-center rounded-full bg-ocean-400 px-5"
        style={clayButtonShadow()}
      >
        <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />

        <Text className="ml-2 text-[11px] font-extrabold text-white">
          Create Announcement
        </Text>
      </Pressable>
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  maxLength,
  autoCapitalize,
  inputClass = "",
}: any) {
  return (
    <View className="mt-3">
      <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.7px] text-ink-muted">
        {label}
      </Text>

      <View
        className="rounded-[17px] border border-white/90 bg-clay-surface px-4 py-1"
        style={clayShadow()}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          multiline={multiline}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          className={`text-[12px] font-semibold text-ink-dark ${
            multiline ? "py-3" : "h-[46px]"
          } ${inputClass}`}
          textAlignVertical={multiline ? "top" : "center"}
        />
      </View>
    </View>
  );
}

function Choice({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full border px-4 py-2.5 ${
        selected
          ? "border-ocean-300 bg-ocean-100"
          : "border-white/90 bg-clay-surface"
      }`}
    >
      <Text
        className={`text-[10px] font-extrabold ${
          selected ? "text-ocean-700" : "text-ink-secondary"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="mr-2 flex-1 rounded-[16px] bg-white/60 px-3 py-2.5">
      <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-ink-muted">
        {label}
      </Text>

      <Text className="mt-0.5 text-[16px] font-extrabold text-ink-dark">
        {value}
      </Text>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View className="mr-2 mt-2 rounded-full bg-ocean-50 px-2.5 py-1.5">
      <Text className="text-[8px] font-extrabold uppercase tracking-[0.5px] text-ocean-700">
        {label}
      </Text>
    </View>
  );
}

function PriorityBadge({ priority }: { priority: AnnouncementPriority }) {
  const classes =
    priority === "urgent"
      ? "bg-red-50 text-red-700"
      : priority === "important"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  const [background, textColor] = classes.split(" ");

  return (
    <View className={`rounded-full px-2.5 py-1.5 ${background}`}>
      <Text className={`text-[8px] font-extrabold uppercase ${textColor}`}>
        {priority}
      </Text>
    </View>
  );
}

function audienceLabel(value: AnnouncementAudience) {
  return value === "staff"
    ? "Staff Only"
    : value === "commuters"
      ? "Commuters Only"
      : "Everyone";
}

function categoryLabel(value: AnnouncementCategory) {
  return (
    CATEGORY_OPTIONS.find((item) => item.value === value)?.label ?? "General"
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function clayShadow() {
  return {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
  };
}

function clayButtonShadow() {
  return {
    shadowColor: colors.primaryDark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  };
}

function redButtonShadow() {
  return {
    shadowColor: "#DC2626",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  };
}

function modalShadow() {
  return {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 14,
  };
}
