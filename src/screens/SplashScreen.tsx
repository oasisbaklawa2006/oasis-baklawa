import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { resolveBuyerSession } from "@/lib/api/buyer";
import { supabase } from "@/lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        navigation.replace("Welcome");
        return;
      }

      const snapshot = await resolveBuyerSession();
      if (cancelled) return;

      if (snapshot.state === "approved_buyer") {
        navigation.replace("Home");
        return;
      }

      if (snapshot.state === "no_application" || snapshot.state === "application_pending") {
        navigation.replace("Register");
        return;
      }

      navigation.replace("Home");
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.brand}>Oasis Baklawa</Text>
      <ActivityIndicator color="#FFF" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#7A1B2B", alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 28, fontWeight: "700", color: "#FFF8F2", letterSpacing: 0.5 },
  spinner: { marginTop: 20 },
});
