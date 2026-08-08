import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BuyerSessionProvider } from "@/context/BuyerSessionContext";
import { RootNavigator } from "@/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <BuyerSessionProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </BuyerSessionProvider>
    </SafeAreaProvider>
  );
}
