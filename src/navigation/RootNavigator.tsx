import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { MainTabNavigator } from "@/navigation/MainTabNavigator";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { SplashScreen } from "@/screens/SplashScreen";
import { WelcomeScreen } from "@/screens/WelcomeScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { RegisterScreen } from "@/screens/RegisterScreen";
import { AccessPendingScreen } from "@/screens/AccessPendingScreen";
import { AccessRejectedScreen } from "@/screens/AccessRejectedScreen";
import { ProductDetailScreen } from "@/screens/ProductDetailScreen";
import { OrderDetailScreen } from "@/screens/OrderDetailScreen";
import { QuickOrderScreen } from "@/screens/QuickOrderScreen";
import { AiOrderScreen } from "@/screens/AiOrderScreen";
import { CartScreen } from "@/screens/CartScreen";
import { CheckoutScreen } from "@/screens/CheckoutScreen";
import { DocumentsScreen } from "@/screens/DocumentsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="AccessPending" component={AccessPendingScreen} />
        <Stack.Screen name="AccessRejected" component={AccessRejectedScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="QuickOrder" component={QuickOrderScreen} />
        <Stack.Screen name="AiOrder" component={AiOrderScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
