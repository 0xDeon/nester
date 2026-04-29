import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "bold" },
          contentStyle: { backgroundColor: "#0f172a" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Nester" }} />
        <Stack.Screen name="dashboard/index" options={{ title: "Dashboard" }} />
        <Stack.Screen name="vaults/index" options={{ title: "Vaults" }} />
      </Stack>
    </>
  );
}