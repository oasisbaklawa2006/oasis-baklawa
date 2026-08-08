import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BuyerEligibilityState } from "@/lib/api/buyer";

const APPLICATION_STATUS_PREFIX = "oasis_buyer_application_status_v1:";

function applicationStatusKey(userId: string): string {
  return `${APPLICATION_STATUS_PREFIX}${userId}`;
}

export async function readStoredApplicationStatus(userId: string): Promise<BuyerEligibilityState | null> {
  try {
    const value = await AsyncStorage.getItem(applicationStatusKey(userId));
    if (value === "application_pending" || value === "rejected_ineligible") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export async function storeApplicationStatus(userId: string, status: BuyerEligibilityState): Promise<void> {
  try {
    if (status === "application_pending" || status === "rejected_ineligible") {
      await AsyncStorage.setItem(applicationStatusKey(userId), status);
      return;
    }
    if (status === "approved_buyer") {
      await AsyncStorage.removeItem(applicationStatusKey(userId));
    }
  } catch {
    // UX cache only — never block session resolution on persistence failure.
  }
}

export async function clearStoredApplicationStatus(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(applicationStatusKey(userId));
  } catch {
    // Best-effort on sign-out.
  }
}
