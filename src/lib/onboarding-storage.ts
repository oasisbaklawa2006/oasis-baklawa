import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "oasis_buyer_onboarding_complete_v1";

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // Non-blocking UX preference only.
  }
}

export async function clearOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Best-effort for diagnostics.
  }
}
