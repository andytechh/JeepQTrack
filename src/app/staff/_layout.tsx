// app/_layout.tsx
import { Stack } from "expo-router";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="staff/login" />
        <Stack.Screen name="staff/(driver)" />
        <Stack.Screen name="staff/(dispatcher)" />
        <Stack.Screen name="staff/(admin)" />
      </Stack>
      <Toast />
    </>
  );
}
