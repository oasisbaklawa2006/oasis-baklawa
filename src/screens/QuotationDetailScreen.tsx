import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { UnavailableState } from "@/components/StateViews";
import { QUOTE_BACKEND_UNAVAILABLE_MESSAGE } from "@/lib/quote-guards";
import { isQuoteBackendAvailable } from "@/types/quote-contract";

type Props = NativeStackScreenProps<RootStackParamList, "QuotationDetail">;

export function QuotationDetailScreen({ route }: Props) {
  const backendAvailable = isQuoteBackendAvailable();

  return (
    <BuyerGate>
      <Screen title="Quotation detail" subtitle={route.params.quotationNumber}>
        <UnavailableState
          title={backendAvailable ? "Quotation unavailable" : "Quotation flow pending Core contracts"}
          message={
            backendAvailable
              ? "This quotation could not be loaded for your account."
              : QUOTE_BACKEND_UNAVAILABLE_MESSAGE
          }
        />
      </Screen>
    </BuyerGate>
  );
}
