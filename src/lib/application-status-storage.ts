import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BuyerEligibilityState } from "@/lib/api/buyer";

const APPLICATION_STATUS_KEY = "oasis_buyer_application_status";

export async function readStoredApplicationStatus(): Promise<BuyerEligibilityState | null> {
  const value = await AsyncStorage.getItem(APPLICATION_STATUS_KEY);
  if (value === "application_pending" || value === "rejected_ineligible") {
    return value;
  }
  return null;
}

export async function storeApplicationStatus(status: BuyerEligibilityState): Promise<void> {
  if (status === "application_pending" || status === "rejected_ineligible") {
    await AsyncStorage.setItem(APPLICATION_STATUS_KEY, status);
    return;
  }
  if (status === "approved_buyer") {
    await AsyncStorage.removeItem(APPLICATION_STATUS_KEY);
  }
}
