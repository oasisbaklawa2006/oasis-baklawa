import { Link } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>OASIS BAKLAWA</Text>
        <Text style={styles.title}>Arabic sweets, crafted for remarkable occasions.</Text>
        <Text style={styles.copy}>Discover the collection, manage trade orders and receive dispatch updates in one private buyer experience.</Text>
        <View style={styles.actions}>
          <Link href="/sign-in" style={styles.primary}>Sign in</Link>
          <Link href="/register" style={styles.secondary}>Register your business</Link>
        </View>
        <View style={styles.links}>
          <Text>About us</Text><Text>Upcoming events</Text><Text>Contact support</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F1E7' },
  hero: { flex: 1, justifyContent: 'center', padding: 28, gap: 20 },
  eyebrow: { letterSpacing: 3, fontSize: 13, fontWeight: '700', color: '#7C5B2A' },
  title: { fontSize: 40, lineHeight: 46, fontWeight: '700', color: '#20160E' },
  copy: { fontSize: 17, lineHeight: 25, color: '#5A493A' },
  actions: { gap: 12, marginTop: 8 },
  primary: { backgroundColor: '#20160E', color: '#FFF', padding: 16, textAlign: 'center', borderRadius: 14, overflow: 'hidden', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#20160E', color: '#20160E', padding: 16, textAlign: 'center', borderRadius: 14, overflow: 'hidden', fontWeight: '700' },
  links: { marginTop: 20, gap: 12 },
});
