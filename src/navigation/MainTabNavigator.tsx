import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "@/navigation/types";
import { CatalogueScreen } from "@/screens/CatalogueScreen";
import { OrdersScreen } from "@/screens/OrdersScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { SupportScreen } from "@/screens/SupportScreen";
import { AccountScreen } from "@/screens/AccountScreen";
import { colors, typography } from "@/theme";

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Catalogue: "◈",
    Orders: "◎",
    Dashboard: "◇",
    Support: "◆",
    Account: "○",
  };
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>{icons[label] ?? "·"}</Text>
    </View>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.action,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Catalogue" component={CatalogueScreen} options={{ tabBarLabel: "Catalogue" }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ tabBarLabel: "Orders" }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: "Home" }} />
      <Tab.Screen name="Support" component={SupportScreen} options={{ tabBarLabel: "Support" }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarLabel: "My Account" }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surfacePremium,
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    paddingTop: 4,
    height: 60,
  },
  tabLabel: {
    fontFamily: typography.fontFamilySansMedium,
    fontSize: 10,
    marginBottom: 4,
  },
  iconWrap: { alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 18, color: colors.textMuted },
  iconFocused: { color: colors.action },
});
