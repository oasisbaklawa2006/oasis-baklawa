import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { BuyerServiceRequestPanel } from "@/components/BuyerServiceRequestPanel";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "PackagingDecoration">;

/**
 * Provides a governed packaging enquiry without inventing packaging SKUs,
 * decoration prices or compatibility that Core does not currently project.
 */
export function PackagingDecorationScreen({ navigation }: Props) {
  return (
    <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen
        title="Packaging & Decoration"
        subtitle="Packaging, sleeves, boxes and custom presentation"
      >
        <BuyerServiceRequestPanel
          category="CATALOGUE"
          subject="Packaging and decoration enquiry"
          intro="A governed packaging-option catalogue is not exposed to the Buyer app yet. Tell us the product, quantity, box or tray format, branding/decoration requirement and target date so the team can confirm real options and commercial terms."
          placeholder="Example: 250 mixed baklawa boxes, rigid box with gold logo, inner tray required, delivery by 15 December…"
          submitLabel="Request packaging options"
          historyTitle="Packaging requests"
        />
        <OasisButton
          label="Browse published products"
          variant="secondary"
          onPress={() => navigation.navigate("MainTabs", { screen: "Catalogue" })}
        />
      </Screen>
    </BuyerGate>
  );
}
