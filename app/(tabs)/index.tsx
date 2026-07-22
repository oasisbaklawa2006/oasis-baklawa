import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { hasCompletedFirstRun } from '@/onboarding/firstRun';

export default function HomeScreen() {
  useEffect(() => {
    hasCompletedFirstRun().then((complete) => {
      if (!complete) router.replace('/onboarding');
    }).catch(() => undefined);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.kicker}>WELCOME BACK</Text>
        <Text style={styles.title}>Your Oasis trade desk</Text>
        <Text style={styles.copy}>Explore new collections, repeat recent orders and track every dispatch.</Text>
        <Link href="/(tabs)/catalogue" style={styles.card}>Browse catalogue</Link>
        <Link href="/(tabs)/orders" style={styles.card}>Repeat or track an order</Link>
        <Link href="/baklava-guide" style={styles.educationCard}>New to Baklava? Open the buyer guide</Link>
        <Link href="/onboarding" style={styles.tourLink}>Replay the app tour</Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF9' },
  body: { padding: 24, gap: 18 },
  kicker: { letterSpacing: 2, color: '#7C5B2A', fontWeight: '700' },
  title: { fontSize: 34, fontWeight: '700', color: '#20160E' },
  copy: { fontSize: 17, lineHeight: 25, color: '#5A493A' },
  card: { padding: 20, borderRadius: 16, backgroundColor: '#F7F1E7', color: '#20160E', fontWeight: '700', overflow: 'hidden' },
  educationCard: { padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#D9C6AE', color: '#7C5B2A', fontWeight: '800', overflow: 'hidden' },
  tourLink: { textAlign: 'center', padding: 10, color: '#756455', fontWeight: '700' },
});
