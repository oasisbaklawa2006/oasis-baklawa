import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { BuyerServiceRequestPanel } from "@/components/BuyerServiceRequestPanel";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchCustomerCompany } from "@/lib/api/buyer";
import { parseRpcError } from "@/lib/rpc-errors";
import type { CustomerCompany } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Addresses">;

/**
 * Shows the authoritative registered address and provides an auditable request
 * path for changes/additional delivery addresses until Core publishes a
 * governed multi-address projection.
 */
export function AddressesScreen({ navigation }: Props) {
  const [company, setCompany] = useState<CustomerCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCompany(await fetchCustomerCompany());
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <BuyerGate requireApprovedBuyer onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen title="Addresses" subtitle="Registered account address and governed change requests">
        {loading ? (
          <LoadingState message="Loading account address…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>REGISTERED ADDRESS</Text>
              <Text style={styles.value}>{company?.registered_address || "No registered address is available in the current company projection."}</Text>
            </View>
            <BuyerServiceRequestPanel
              category="ACCOUNT"
              subject="Address update request"
              intro="Additional billing/shipping addresses are not exposed as a customer-safe address book yet. Use this request for a registered-address correction or an additional delivery-address requirement; Oasis must validate it before operational use."
              placeholder="State the address to add or change, its purpose (billing / shipping / branch), contact person and any delivery instructions…"
              submitLabel="Submit address request"
              historyTitle="Address requests"
            />
          </>
        )}
      </Screen>
    </BuyerGate>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surfacePremium,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  label: {
    fontFamily: typography.fontFamilySansSemiBold,
    fontSize: typography.sizeXs,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  value: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.sizeMd,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});
