import { Tabs } from 'expo-router';

export default function BuyerTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#7C5B2A' }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="catalogue" options={{ title: 'Catalogue' }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
