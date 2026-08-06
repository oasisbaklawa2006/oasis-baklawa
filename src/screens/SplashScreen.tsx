import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { supabase } from "@/lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      navigation.replace(data.session ? "Home" : "Welcome");
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
