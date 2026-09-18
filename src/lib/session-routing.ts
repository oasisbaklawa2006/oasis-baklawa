import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import type { BuyerSessionSnapshot } from "@/lib/api/buyer";

type SessionNavigator = Pick<NativeStackNavigationProp<RootStackParamList>, "replace">;

export function routeFromBuyerSnapshot(
  navigation: SessionNavigator,
  snapshot: BuyerSessionSnapshot,
  onboarded: boolean
): void {
  switch (snapshot.state) {
    case "unauthenticated":
      navigation.replace(onboarded ? "Welcome" : "Onboarding");
      break;
    case "approved_buyer":
      navigation.replace("MainTabs", { screen: "Dashboard" });
      break;
    // PENDING / REJECTED / UNKNOWN are pre-auth states owned by the
    // buyer-login-gateway preflight — a session should never resolve to them.
    // "no_membership" is the fail-closed catch when that invariant doesn't
    // hold (e.g. backend state changed after login); it routes to recovery,
    // never back to Register, so an approved-then-desynced buyer is never
    // sent to reapply (the historical UAT deadlock).
    case "no_membership":
    case "backend_failure":
      navigation.replace("SessionRecovery", {
        message: snapshot.message ?? "We could not verify your session. Check your connection and try again.",
      });
      break;
    default:
      navigation.replace("SessionRecovery", {
        message: snapshot.message ?? "We could not verify your session. Check your connection and try again.",
      });
  }
}
