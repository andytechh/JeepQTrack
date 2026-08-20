import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { supabase } from "../../../shared/config/supabase";
import { JeepneyWithOccupancy } from "./useDispatcherJeepneys";

export function useDispatcherAlerts(dispatcherId?: string) {
  const [alertModalVisible, setAlertModalVisible] = useState(false);

  const [notifying, setNotifying] = useState(false);

  const openAlertModal = useCallback(() => {
    setAlertModalVisible(true);
  }, []);

  const closeAlertModal = useCallback(() => {
    setAlertModalVisible(false);
  }, []);

  const handleSendAlert = useCallback(
    async (jeepneyId: string, message: string) => {
      try {
        if (!dispatcherId) {
          throw new Error("Dispatcher account not found.");
        }

        const { error } = await supabase.from("alerts").insert({
          jeepney_id: jeepneyId,
          dispatcher_id: dispatcherId,
          message,
          sent_at: new Date().toISOString(),
          status: "sent",
        });

        if (error) {
          throw error;
        }

        Alert.alert("Alert Sent", "Alert sent to jeepney successfully.");

        return {
          success: true,
          error: null,
        };
      } catch (error) {
        console.error("Send alert error:", error);

        Alert.alert("Error", "Failed to send alert. Please try again.");

        return {
          success: false,
          error,
        };
      }
    },
    [dispatcherId],
  );

  const handleNotifyDriver = useCallback(
    (jeepney: JeepneyWithOccupancy | null) => {
      if (!jeepney) {
        return;
      }

      Alert.alert(
        "Notify Driver",
        `Send notification to ${jeepney.plate_number}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Send",
            onPress: async () => {
              setNotifying(true);

              try {
                await handleSendAlert(
                  jeepney.id,
                  "Please prepare for departure. You are next in queue.",
                );
              } finally {
                setNotifying(false);
              }
            },
          },
        ],
      );
    },
    [handleSendAlert],
  );

  return {
    alertModalVisible,
    notifying,

    openAlertModal,
    closeAlertModal,

    handleSendAlert,
    handleNotifyDriver,
  };
}
