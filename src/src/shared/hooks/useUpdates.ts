import * as Updates from "expo-updates";
import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState } from "react-native";

/**
 * Checks for an EAS Update on launch and every time the app returns
 * to the foreground. If one exists it is downloaded, then the user is
 * asked to restart.
 *
 * Does nothing in development or Expo Go (Updates.isEnabled is false).
 */
export function useAppUpdates(enabled = true) {
  const checkingRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || checkingRef.current) return;

    checkingRef.current = true;

    try {
      const result = await Updates.checkForUpdateAsync();

      if (!result.isAvailable) return;

      await Updates.fetchUpdateAsync();

      Alert.alert(
        "Update ready",
        "A new version of SmartQs has been downloaded. Restart to apply it.",
        [
          { text: "Later", style: "cancel" },
          { text: "Restart now", onPress: () => Updates.reloadAsync() },
        ],
      );
    } catch (error) {
      console.warn("Update check failed:", error);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    checkForUpdate();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkForUpdate();
      }
    });

    return () => subscription.remove();
  }, [enabled, checkForUpdate]);

  return { checkForUpdate };
}
