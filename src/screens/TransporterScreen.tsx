import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { BuyerServiceRequestPanel } from "@/components/BuyerServiceRequestPanel";
import { Screen } from "@/components/Screen";

type Props = NativeStackScreenProps<RootStackParamList, "Transporter">;

/**
 * Lets the buyer submit and track preferred-transporter instructions while
 * keeping the actual saved transporter master fail-closed until Core exposes
 * an authoritative customer-safe projection.
 */
export function TransporterScreen({ navigation }: Props) {
  return (
    <BuyerGate requireApprovedBuyer onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
      <Screen
        title="Preferred Transporter"
        subtitle="Dispatch preference requests and history"
      >
        <BuyerServiceRequestPanel
          category="DELIVERY"
          subject="Preferred transporter request"
          intro="The current account projection does not expose a confirmed saved transporter. You can submit or update your preferred transporter and dispatch instructions here; Oasis must confirm the request before it becomes an operational dispatch instruction."
          placeholder="Transporter/company name, contact number if known, destination/route, and any dispatch instructions…"
          submitLabel="Submit transporter preference"
          historyTitle="Transporter preference requests"
        />
      </Screen>
    </BuyerGate>
  );
}
