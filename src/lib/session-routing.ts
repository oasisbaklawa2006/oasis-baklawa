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
    case "application_pending":
      navigation.replace("AccessPending");
      break;
    case "rejected_ineligible":
      navigation.replace("AccessRejected");
      break;
    case "no_application":
      navigation.replace("Register");
      break;
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
