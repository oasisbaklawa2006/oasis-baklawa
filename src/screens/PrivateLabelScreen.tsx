import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { BuyerServiceRequestPanel } from "@/components/BuyerServiceRequestPanel";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "PrivateLabel">;

/**
 * Provides a real governed private-label enquiry path while keeping product
 * eligibility fail-closed until Core publishes a customer-safe eligibility
 * projection.
 */
export function PrivateLabelScreen({ navigation }: Props) {
  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen
        title="Private Label"
        subtitle="Custom branding and private-label feasibility"
      >
        <BuyerServiceRequestPanel
          category="CATALOGUE"
          subject="Private label enquiry"
          intro="The current Buyer catalogue does not expose authoritative private-label eligibility, MOQ or customisation terms. Send the products, quantities, branding requirement and target date you want reviewed; Oasis will respond through the governed enquiry flow."
          placeholder="Example: Pistachio baklawa, 500 boxes, our logo sleeve, delivery required by 20 November…"
          submitLabel="Request private-label review"
          historyTitle="Private-label requests"
        />
        <OasisButton
          label="Browse published catalogue"
          variant="secondary"
          onPress={() => navigation.navigate("MainTabs", { screen: "Catalogue" })}
          accessibilityHint="Opens the current governed product catalogue"
        />
      </Screen>
    </BuyerGate>
  );
}
