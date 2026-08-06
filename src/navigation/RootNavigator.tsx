import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { SplashScreen } from "@/screens/SplashScreen";
import { WelcomeScreen } from "@/screens/WelcomeScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { RegisterScreen } from "@/screens/RegisterScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { CatalogueScreen } from "@/screens/CatalogueScreen";
import { AiOrderScreen } from "@/screens/AiOrderScreen";
import { CartScreen } from "@/screens/CartScreen";
import { CheckoutScreen } from "@/screens/CheckoutScreen";
import { OrdersScreen } from "@/screens/OrdersScreen";
import { DocumentsScreen } from "@/screens/DocumentsScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Catalogue" component={CatalogueScreen} />
        <Stack.Screen name="AiOrder" component={AiOrderScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
