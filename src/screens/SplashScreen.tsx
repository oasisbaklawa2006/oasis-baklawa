import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { resolveBuyerSession } from "@/lib/api/buyer";
import { hasCompletedOnboarding } from "@/lib/onboarding-storage";
import { supabase } from "@/lib/supabase";
import { colors, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        const onboarded = await hasCompletedOnboarding();
        if (cancelled) return;
        navigation.replace(onboarded ? "Welcome" : "Onboarding");
        return;
      }

      const snapshot = await resolveBuyerSession();
      if (cancelled) return;

      switch (snapshot.state) {
        case "unauthenticated": {
          const onboarded = await hasCompletedOnboarding();
          if (cancelled) return;
          navigation.replace(onboarded ? "Welcome" : "Onboarding");
          break;
        }
        case "approved_buyer":
          navigation.replace("MainTabs", { screen: "Dashboard" });
          break;
        case "application_pending":
          navigation.replace("AccessPending");
          break;
        case "rejected_ineligible":
          navigation.replace("AccessRejected");
          break;
        case "no_application":
          navigation.replace("Register");
          break;
        default:
          navigation.replace("MainTabs", { screen: "Dashboard" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.brand} accessibilityRole="header">
        Oasis Baklawa
      </Text>
      <ActivityIndicator color={colors.action} style={styles.spinner} accessibilityLabel="Loading" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontFamily: typography.fontFamilySerifBold,
    fontSize: typography.sizeXxl,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  spinner: { marginTop: 20 },
});
