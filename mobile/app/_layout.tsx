import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/lib/auth-context";

function RootNavigation() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inLogin = segments[0] === "login";

    if (!session && !inLogin) {
      router.replace("/login");
      return;
    }

    if (session && inLogin) {
      router.replace("/");
      return;
    }

    // vendedor/promotor são os únicos papéis previstos no app mobile
    if (profile && !["promotor", "vendedor"].includes(profile.role) && !inLogin) {
      router.replace("/login");
    }
  }, [session, profile, loading, segments]);

  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#0f172a" }, headerTintColor: "#fff" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ title: "Minhas rotas" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigation />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
