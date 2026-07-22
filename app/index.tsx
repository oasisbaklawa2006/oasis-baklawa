import { Link } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>OASIS BAKLAWA</Text>
        <Text style={styles.title}>Arabic sweets, crafted for remarkable occasions.</Text>
        <Text style={styles.copy}>Explore the collection as a guest. Confidential trade pricing, ordering and account operations are reserved for approved business buyers.</Text>
        <View style={styles.actions}>
          <Link href="/explore" style={styles.primary}>Explore the collection</Link>
          <Link href="/onboarding" style={styles.demo}>Take the 60-second app tour</Link>
          <Link href="/sign-in" style={styles.secondary}>Login to buyer account</Link>
          <Link href="/request-access" style={styles.tertiary}>Request trade access</Link>
        </View>
        <View style={styles.privateCard}>
          <Text style={styles.privateTitle}>Private B2B access</Text>
          <Text style={styles.privateCopy}>Buyer category and price grade are assigned only after business verification and backend approval.</Text>
        </View>
        <View style={styles.links}>
          <Text style={styles.link}>About us</Text><Text style={styles.link}>Upcoming events</Text><Text style={styles.link}>Contact support</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F1E7' },
  hero: { flex: 1, justifyContent: 'center', padding: 28, gap: 18 },
  eyebrow: { letterSpacing: 3, fontSize: 13, fontWeight: '700', color: '#7C5B2A' },
  title: { fontSize: 40, lineHeight: 46, fontWeight: '700', color: '#20160E' },
  copy: { fontSize: 17, lineHeight: 25, color: '#5A493A' },
  actions: { gap: 11, marginTop: 8 },
  primary: { backgroundColor: '#20160E', color: '#FFF', padding: 16, textAlign: 'center', borderRadius: 14, overflow: 'hidden', fontWeight: '700' },
  demo: { backgroundColor: '#FFF9F0', borderWidth: 1, borderColor: '#D7C2A6', color: '#7C5B2A', padding: 15, textAlign: 'center', borderRadius: 14, overflow: 'hidden', fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: '#20160E', color: '#20160E', padding: 16, textAlign: 'center', borderRadius: 14, overflow: 'hidden', fontWeight: '700' },
  tertiary: { color: '#7C5B2A', padding: 13, textAlign: 'center', fontWeight: '800' },
  privateCard: { marginTop: 4, padding: 16, borderRadius: 16, backgroundColor: '#FFF9F0', borderWidth: 1, borderColor: '#E3D4C1' },
  privateTitle: { fontWeight: '800', color: '#20160E' },
  privateCopy: { marginTop: 5, fontSize: 13, lineHeight: 19, color: '#6A5746' },
  links: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  link: { color: '#6B5847', fontSize: 13, fontWeight: '600' },
});
