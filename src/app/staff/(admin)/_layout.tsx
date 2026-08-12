// app/staff/(admin)/_layout.tsx
import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main tabs */}
      <Stack.Screen name="(tabs)" />

      {/* Screens outside tabs (accessible via push) */}
      <Stack.Screen name="(screens)/chat" />
      <Stack.Screen name="(screens)/trips" />
      <Stack.Screen name="(screens)/reports" />

      {/* Create screens (modals) */}
      <Stack.Screen name="users/new" options={{ presentation: "modal" }} />
      <Stack.Screen name="jeepneys/new" options={{ presentation: "modal" }} />

      {/* Detail / edit screens */}
      <Stack.Screen name="users/[id]/index" />
      <Stack.Screen name="users/[id]/edit" />
      <Stack.Screen name="jeepneys/[id]/index" />
      <Stack.Screen name="jeepneys/[id]/edit" />
      <Stack.Screen name="trips/[id]" />
    </Stack>
  );
}
