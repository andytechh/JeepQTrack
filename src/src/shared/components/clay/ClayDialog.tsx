import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react-native";
import { Modal, Pressable, Text, View } from "react-native";

export type ClayDialogState = {
  kind: "success" | "error" | "confirm";
  title: string;
  text: string;
  confirmLabel?: string;
  onConfirm?: () => void;
} | null;

const THEME = {
  success: {
    bubble: "bg-emerald-100",
    icon: <CheckCircle2 size={30} color="#059669" strokeWidth={2.4} />,
    button: "bg-emerald-500",
  },
  error: {
    bubble: "bg-red-100",
    icon: <AlertTriangle size={30} color="#DC2626" strokeWidth={2.4} />,
    button: "bg-red-500",
  },
  confirm: {
    bubble: "bg-amber-100",
    icon: <HelpCircle size={30} color="#B45309" strokeWidth={2.4} />,
    button: "bg-ocean-400",
  },
} as const;

export default function ClayDialog({
  dialog,
  onClose,
}: {
  dialog: ClayDialogState;
  onClose: () => void;
}) {
  if (!dialog) return null;
  const theme = THEME[dialog.kind];
  const isConfirm = dialog.kind === "confirm";

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center px-8">
        <Pressable
          onPress={onClose}
          accessibilityLabel="Dismiss"
          className="absolute inset-0 bg-slate-900/30"
        />

        <View className="w-full max-w-[340px] items-center rounded-[28px] border border-white bg-clay-surface p-6 shadow-clay-floating">
          <View
            className={`h-[68px] w-[68px] items-center justify-center rounded-[24px] border border-white/90 shadow-clay-sm ${theme.bubble}`}
          >
            {theme.icon}
          </View>

          <Text className="mt-4 text-center text-[17px] font-extrabold text-ink-dark">
            {dialog.title}
          </Text>
          <Text className="mt-1.5 text-center text-[12px] font-medium leading-[18px] text-ink-secondary">
            {dialog.text}
          </Text>

          <View className="mt-5 w-full flex-row">
            {isConfirm && (
              <Pressable
                onPress={onClose}
                className="mr-2 flex-1 items-center justify-center rounded-full border border-white/90 bg-slate-100 py-3.5"
              >
                <Text className="text-[11px] font-extrabold text-slate-600">
                  Cancel
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                onClose();
                if (isConfirm) dialog.onConfirm?.();
              }}
              className={`flex-1 items-center justify-center rounded-full py-3.5 shadow-clay-sm ${theme.button}`}
            >
              <Text className="text-[11px] font-extrabold text-white">
                {isConfirm ? (dialog.confirmLabel ?? "Confirm") : "Got it"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
