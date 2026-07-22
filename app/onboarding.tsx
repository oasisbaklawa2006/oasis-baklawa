import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { completeFirstRun, type BaklavaFamiliarity } from '@/onboarding/firstRun';

const TOUR = [
  {
    kicker: 'PRIVATE BUYER EXPERIENCE',
    title: 'Discover, order and track in one place.',
    copy: 'Browse approved collections, see your assigned trade prices, build orders and follow dispatch progress without calling for routine updates.',
  },
  {
    kicker: 'BUILT FOR REPEAT BUSINESS',
    title: 'Order faster every time.',
    copy: 'Use Quick Order, repeat eligible past orders, follow pack-size guidance and keep your regular buying workflow close at hand.',
  },
  {
    kicker: 'A MORE PERSONAL OASIS',
    title: 'Let us shape the experience for you.',
    copy: 'A single question helps us decide whether to begin with product education or take you directly to the trade desk.',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  async function finish(familiarity: BaklavaFamiliarity) {
    try {
      setSaving(true);
      await completeFirstRun(familiarity);
      router.replace(familiarity === 'new' ? '/baklava-guide' : '/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  const item = TOUR[step];
  const asking = step === TOUR.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.progressRow}>
          {TOUR.map((_, index) => <View key={index} style={[styles.progress, index <= step && styles.progressActive]} />)}
        </View>
        <Text style={styles.kicker}>{item.kicker}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.copy}>{item.copy}</Text>

        {asking ? (
          <View style={styles.questionCard}>
            <Text style={styles.question}>Are you new to Baklava?</Text>
            <Text style={styles.questionCopy}>We will use this only to personalise your first visit. You can open the guide again anytime.</Text>
            <TouchableOpacity disabled={saving} style={styles.primary} onPress={() => finish('new')}>
              <Text style={styles.primaryText}>Yes, show me the essentials</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={saving} style={styles.secondary} onPress={() => finish('familiar')}>
              <Text style={styles.secondaryText}>No, take me to my trade desk</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primary} onPress={() => setStep((value) => value + 1)}>
              <Text style={styles.primaryText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(TOUR.length - 1)}>
              <Text style={styles.skip}>Skip tour</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF9' },
  body: { flex: 1, justifyContent: 'center', padding: 28, gap: 18 },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  progress: { flex: 1, height: 4, borderRadius: 4, backgroundColor: '#E8DCCF' },
  progressActive: { backgroundColor: '#8E652C' },
  kicker: { letterSpacing: 2.2, fontSize: 12, fontWeight: '800', color: '#8E652C' },
  title: { fontSize: 38, lineHeight: 44, fontWeight: '800', color: '#20160E' },
  copy: { fontSize: 17, lineHeight: 26, color: '#62503F' },
  actions: { marginTop: 16, gap: 16 },
  questionCard: { marginTop: 12, padding: 22, borderRadius: 20, backgroundColor: '#F7F1E7', gap: 14 },
  question: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#20160E' },
  questionCopy: { fontSize: 14, lineHeight: 21, color: '#665443', marginBottom: 4 },
  primary: { padding: 17, borderRadius: 14, backgroundColor: '#20160E' },
  primaryText: { textAlign: 'center', fontWeight: '800', color: '#FFF' },
  secondary: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#20160E' },
  secondaryText: { textAlign: 'center', fontWeight: '800', color: '#20160E' },
  skip: { textAlign: 'center', padding: 10, fontWeight: '700', color: '#7C5B2A' },
});
