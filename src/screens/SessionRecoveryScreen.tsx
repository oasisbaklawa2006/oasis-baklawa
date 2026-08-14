import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { resolveBuyerSession } from "@/lib/api/buyer";
import { hasCompletedOnboarding } from "@/lib/onboarding-storage";
import { parseRpcError } from "@/lib/rpc-errors";
import { routeFromBuyerSnapshot } from "@/lib/session-routing";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "SessionRecovery">;

const DEFAULT_MESSAGE =
  "We could not verify your session. Check your connection and try again.";

export function SessionRecoveryScreen({ navigation, route }: Props) {
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState(route.params.message);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setRetrying(true);
    setError(null);
    try {
      const snapshot = await resolveBuyerSession();
      if (snapshot.state === "backend_failure") {
        setMessage(snapshot.message ?? DEFAULT_MESSAGE);
        setError("Session verification is still unavailable. Check your connection and try again.");
        return;
      }
      const onboarded = await hasCompletedOnboarding();
      routeFromBuyerSnapshot(navigation, snapshot, onboarded);
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Screen title="Connection issue" subtitle="Session verification" safeAreaEdges={["top", "bottom"]}>
      <View style={styles.body}>
        <Text style={styles.message} accessibilityRole="alert">{message}</Text>
        {error ? (
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <OasisButton
          label={retrying ? "Retrying…" : "Try again"}
          onPress={retry}
          loading={retrying}
          disabled={retrying}
        />
        <OasisButton
          label="Return to welcome"
          variant="secondary"
          onPress={() => navigation.replace("Welcome")}
          disabled={retrying}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.lg, gap: spacing.md },
  message: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  error: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.error },
});
