import { QueueView } from "@/src/shared/components/queue/QueueView";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native";

export default function DispatcherQueueScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <QueueView onBack={() => router.back()} title="Dispatcher Queue" />
    </SafeAreaView>
  );
}
