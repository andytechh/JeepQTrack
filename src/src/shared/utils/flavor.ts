import Constants from "expo-constants";

export type AppFlavor = "staff" | "commuter";

export const getAppFlavor = (): AppFlavor => {
  const variant = Constants.expoConfig?.extra?.appVariant;
  return variant === "staff" ? "staff" : "commuter";
};

export const isStaffApp = (): boolean => getAppFlavor() === "staff";
export const isCommuterApp = (): boolean => getAppFlavor() === "commuter";
