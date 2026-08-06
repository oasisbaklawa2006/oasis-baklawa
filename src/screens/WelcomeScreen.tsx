import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const GREETINGS = ["Welcome", "Namaste", "स्वागत है", "خوش آمدید"];

export function WelcomeScreen({ navigation }: Props) {
  const [greetingIndex] = useState(() => Math.floor(Math.random() * GREETINGS.length));

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{GREETINGS[greetingIndex]}</Text>
      <Text style={styles.brand}>Oasis Baklawa</Text>
      <Text style={styles.tagline}>Artisan sweets, wholesale trade, delivered.</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.secondaryButtonText}>Create Account / B2B Trade Application</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8F2", alignItems: "center", justifyContent: "center", padding: 24 },
  greeting: { fontSize: 16, color: "#8A6B5C", marginBottom: 4 },
  brand: { fontSize: 30, fontWeight: "700", color: "#7A1B2B" },
  tagline: { fontSize: 14, color: "#8A6B5C", marginTop: 8, marginBottom: 40, textAlign: "center" },
  actions: { width: "100%", gap: 12 },
  primaryButton: { backgroundColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  primaryButtonText: { color: "#FFF", fontWeight: "600", fontSize: 16 },
  secondaryButton: { borderWidth: 1, borderColor: "#7A1B2B", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  secondaryButtonText: { color: "#7A1B2B", fontWeight: "600", fontSize: 14 },
});
