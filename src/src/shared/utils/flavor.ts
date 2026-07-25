import Constants from "expo-constants";

export type AppFlavor = "staff" | "commuter";

export const getAppFlavor = (): AppFlavor => {
  const envFlavor = process.env.EXPO_PUBLIC_APP_FLAVOR;
  const extraFlavor = Constants.expoConfig?.extra?.appFlavor;
  const flavor = envFlavor || extraFlavor || "staff";
  return flavor as AppFlavor;
};

export const isStaffApp = (): boolean => getAppFlavor() === "staff";
export const isCommuterApp = (): boolean => getAppFlavor() === "commuter";
