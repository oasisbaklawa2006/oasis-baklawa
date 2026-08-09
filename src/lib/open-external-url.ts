import { Alert, Linking } from "react-native";

export async function openExternalUrl(url: string, fallbackMessage?: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      throw new Error(fallbackMessage ?? "This action is not available on your device.");
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Unable to open link", fallbackMessage ?? "Try again or contact Oasis Baklawa support.");
  }
}
