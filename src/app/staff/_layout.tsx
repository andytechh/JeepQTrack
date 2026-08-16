import { Stack } from "expo-router";

export default function StaffLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="(admin)"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="(dispatcher)"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="(driver)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
