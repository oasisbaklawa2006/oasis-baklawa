import React from "react";
import {
  NavigationContainer,
  type LinkingOptions,
} from "@react-navigation/native";
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
import { SessionRecoveryScreen } from "@/screens/SessionRecoveryScreen";
import { ProductDetailScreen } from "@/screens/ProductDetailScreen";
import { OrderDetailScreen } from "@/screens/OrderDetailScreen";
import { QuickOrderScreen } from "@/screens/QuickOrderScreen";
import { AiOrderScreen } from "@/screens/AiOrderScreen";
import { CartScreen } from "@/screens/CartScreen";
import { CheckoutScreen } from "@/screens/CheckoutScreen";
import { CommercialReviewScreen } from "@/screens/CommercialReviewScreen";
import { OrderConfirmationScreen } from "@/screens/OrderConfirmationScreen";
import { DocumentsScreen } from "@/screens/DocumentsScreen";
import { QuotationsScreen } from "@/screens/QuotationsScreen";
import { QuotationDetailScreen } from "@/screens/QuotationDetailScreen";
import { OrderPaymentScreen } from "@/screens/OrderPaymentScreen";
import { DeliveredClosureScreen } from "@/screens/DeliveredClosureScreen";
import { CommunicationLogScreen } from "@/screens/CommunicationLogScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();


const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["oasisbaklawa://"],
  config: {
    screens: {
      OrderDetail: "order/:orderId",
      OrderConfirmation: "order/:orderId/confirmation",
      DeliveredClosure: "order/:orderId/delivered",
      CommunicationLog: "communication/:entityId",
      CommercialReview: "commercial-review",
    },
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="AccessPending" component={AccessPendingScreen} />
        <Stack.Screen name="AccessRejected" component={AccessRejectedScreen} />
        <Stack.Screen name="SessionRecovery" component={SessionRecoveryScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="QuickOrder" component={QuickOrderScreen} />
        <Stack.Screen name="AiOrder" component={AiOrderScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="CommercialReview" component={CommercialReviewScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="Quotations" component={QuotationsScreen} />
        <Stack.Screen name="QuotationDetail" component={QuotationDetailScreen} />
        <Stack.Screen name="OrderPayment" component={OrderPaymentScreen} />
        <Stack.Screen name="DeliveredClosure" component={DeliveredClosureScreen} />
        <Stack.Screen name="CommunicationLog" component={CommunicationLogScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
