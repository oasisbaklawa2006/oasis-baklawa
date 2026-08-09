import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainTabParamList, RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { UnavailableState } from "@/components/StateViews";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { fetchCustomerCompany, fetchCustomerTeam } from "@/lib/api/buyer";
import { supabase } from "@/lib/supabase";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerCompany, CustomerTeamMember } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Account">,
  NativeStackScreenProps<RootStackParamList>
>;

export function AccountScreen({ navigation }: Props) {
  const { snapshot, refresh } = useBuyerSession();
  const [company, setCompany] = useState<CustomerCompany | null>(null);
  const [team, setTeam] = useState<CustomerTeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (snapshot?.state !== "approved_buyer") return;
    setError(null);
    try {
      const [companyRow, teamRows] = await Promise.all([fetchCustomerCompany(), fetchCustomerTeam()]);
      setCompany(companyRow);
      setTeam(teamRows);
    } catch (e) {
      setError(parseRpcError(e).message);
    }
  }, [snapshot?.state]);

  useEffect(() => {
    load();
  }, [load]);

  async function signOut() {
    await supabase.auth.signOut();
    setCompany(null);
    setTeam([]);
    await refresh();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: "Welcome" }] });
  }

  if (snapshot?.state === "unauthenticated") {
    return (
      <Screen title="My Account">
        <Text style={styles.copy}>Log in to manage your company profile and team access.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Login")} accessibilityRole="button">
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <Screen title="My Account" subtitle={company?.business_name ?? snapshot?.company?.business_name ?? "Buyer account"}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Account status</Text>
        <Text style={styles.cardValue}>{snapshot?.state.replace(/_/g, " ") ?? "—"}</Text>
      </View>

      {company ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Company</Text>
          <Text style={styles.cardValue}>{company.business_name}</Text>
          {company.gst_number ? <Text style={styles.meta}>GST {company.gst_number}</Text> : null}
          {company.price_tier ? <Text style={styles.meta}>Price tier: {company.price_tier}</Text> : null}
          {company.payment_terms ? <Text style={styles.meta}>Payment terms: {company.payment_terms}</Text> : null}
        </View>
      ) : null}

      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("Documents")} accessibilityRole="button">
        <Text style={styles.linkText}>Documents & statements</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Team access</Text>
      <FlatList
        data={team}
        scrollEnabled={false}
        keyExtractor={(item) => item.profile_id}
        ListEmptyComponent={<UnavailableState title="No team members" message="Team roster is unavailable or empty." />}
        renderItem={({ item }) => (
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{item.full_name ?? item.email ?? "Member"}</Text>
            <Text style={styles.teamRole}>{item.role}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.signOut} onPress={signOut} accessibilityRole="button">
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, color: colors.textSecondary, marginTop: spacing.lg },
  button: { backgroundColor: colors.action, padding: spacing.md, borderRadius: 10, alignItems: "center", marginTop: spacing.lg, minHeight: 44, justifyContent: "center" },
  buttonText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.white },
  card: { backgroundColor: colors.surfacePremium, borderRadius: 12, padding: spacing.lg, marginTop: spacing.md },
  cardLabel: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  cardValue: { fontFamily: typography.fontFamilySerifBold, fontSize: typography.sizeLg, color: colors.textPrimary, marginTop: 4 },
  meta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textSecondary, marginTop: 4 },
  linkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight, marginTop: spacing.md },
  linkText: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  chevron: { fontSize: 20, color: colors.textMuted },
  section: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeLg, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  teamRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  teamName: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeMd, color: colors.textPrimary },
  teamRole: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeSm, color: colors.textMuted },
  signOut: { marginTop: spacing.xl, padding: spacing.md, borderRadius: 10, borderWidth: 1, borderColor: colors.error, alignItems: "center", minHeight: 44, justifyContent: "center" },
  signOutText: { fontFamily: typography.fontFamilySansSemiBold, color: colors.error },
  error: { color: colors.error, marginTop: spacing.sm },
});
