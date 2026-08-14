import { Alert, Linking } from "react-native";

export async function openExternalUrl(url: string, fallbackMessage?: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Unable to open link", fallbackMessage ?? "Try again or contact Oasis Baklawa support.");
  }
}
