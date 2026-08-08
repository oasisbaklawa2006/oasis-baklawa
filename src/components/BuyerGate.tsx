import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useBuyerSession } from "@/context/BuyerSessionContext";

interface BuyerGateProps {
  children: React.ReactNode;
  onLogin?: () => void;
  onRegister?: () => void;
  requireApprovedBuyer?: boolean;
}

export function BuyerGate({ children, onLogin, onRegister, requireApprovedBuyer = true }: BuyerGateProps) {
  const { loading, snapshot } = useBuyerSession();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#7A1B2B" />
      </View>
    );
  }

  if (!requireApprovedBuyer) {
    return <>{children}</>;
  }

  if (snapshot?.state === "approved_buyer") {
    return <>{children}</>;
  }

  const message =
    snapshot?.message ??
    (snapshot?.state === "unauthenticated"
      ? "Log in with your wholesale account to continue."
      : "Your account is not approved for buyer ordering yet.");

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Buyer access required</Text>
      <Text style={styles.message}>{message}</Text>
      {snapshot?.state === "unauthenticated" && onLogin ? (
        <TouchableOpacity style={styles.button} onPress={onLogin}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>
      ) : null}
      {(snapshot?.state === "no_application" || snapshot?.state === "unauthenticated") && onRegister ? (
        <TouchableOpacity style={styles.secondaryButton} onPress={onRegister}>
          <Text style={styles.secondaryButtonText}>B2B Trade Application</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#3A2A22" },
  message: { fontSize: 14, color: "#5A4438", textAlign: "center", lineHeight: 20 },
  button: { backgroundColor: "#7A1B2B", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  buttonText: { color: "#FFF", fontWeight: "700" },
  secondaryButton: { borderWidth: 1, borderColor: "#7A1B2B", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  secondaryButtonText: { color: "#7A1B2B", fontWeight: "700" },
});
