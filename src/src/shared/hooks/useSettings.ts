import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export interface AppSettings {
  darkMode: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  autoRefresh: boolean;
  language: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  notifications: true,
  soundEnabled: true,
  autoRefresh: true,
  language: "English",
};

const STORAGE_KEY = "@app_settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      } else {
        // Save defaults if not set
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(DEFAULT_SETTINGS),
        );
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error("Failed to save settings:", error);
      return false;
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return true;
    } catch (error) {
      console.error("Failed to reset settings:", error);
      return false;
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    resetSettings,
  };
}
