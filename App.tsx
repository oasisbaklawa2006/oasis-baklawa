import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFonts, LibreCaslonText_400Regular, LibreCaslonText_700Bold } from "@expo-google-fonts/libre-caslon-text";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from "@expo-google-fonts/hanken-grotesk";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BuyerSessionProvider } from "@/context/BuyerSessionContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { colors, typography } from "@/theme";

export default function App() {
  const [fontsLoaded] = useFonts({
    LibreCaslonText_400Regular,
    LibreCaslonText_700Bold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.action} />
        <Text style={styles.bootText}>Oasis Baklawa</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <BuyerSessionProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </BuyerSessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center", gap: 12 },
  bootText: { fontFamily: typography.fontFamilySerifBold, fontSize: 20, color: colors.textPrimary },
});
