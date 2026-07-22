import { router } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ESSENTIALS = [
  {
    title: 'What makes Baklava different',
    copy: 'Baklava is built from fine crisp pastry layers, premium nuts and a measured syrup finish. The experience is lighter, flakier and more textured than conventional mithai.',
  },
  {
    title: 'Choose by nut and format',
    copy: 'Start with pistachio, walnut, cashew, almond or mixed selections, then explore familiar shapes, loose assortments, trays, gift boxes and bulk trade packs.',
  },
  {
    title: 'Choose by business use',
    copy: 'Retail counters need strong visual variety and approachable packs. HORECA buyers may prefer portion consistency or frozen formats. Corporate and gifting buyers usually begin with presentation, occasion and budget.',
  },
  {
    title: 'Ordering guidance',
    copy: 'Your approved account shows the correct price grade, pack sizes, minimum quantities and ordering multiples. Quantity steppers help you build complete, practical orders.',
  },
  {
    title: 'Storage and shelf life',
    copy: 'Each approved product page should carry its applicable storage and shelf-life guidance. Use those product-specific instructions rather than one rule for the entire collection.',
  },
];

export default function BaklavaGuideScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.kicker}>BAKLAVA, MADE SIMPLE</Text>
        <Text style={styles.title}>A quick guide for confident buying.</Text>
        <Text style={styles.copy}>A short introduction for buyers discovering Arabic sweets for the first time. Nothing here changes your account, prices or approval.</Text>
        <View style={styles.list}>
          {ESSENTIALS.map((item, index) => (
            <View key={item.title} style={styles.card}>
              <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardCopy}>{item.copy}</Text>
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.primary} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryText}>Enter my trade desk</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/(tabs)/catalogue')}>
          <Text style={styles.secondaryText}>Browse the collection first</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF9' },
  body: { padding: 26, paddingBottom: 44 },
  kicker: { letterSpacing: 2.2, fontSize: 12, fontWeight: '800', color: '#8E652C' },
  title: { marginTop: 12, fontSize: 36, lineHeight: 42, fontWeight: '800', color: '#20160E' },
  copy: { marginTop: 13, fontSize: 16, lineHeight: 24, color: '#62503F' },
  list: { marginTop: 24, gap: 12 },
  card: { flexDirection: 'row', gap: 14, padding: 18, borderRadius: 18, backgroundColor: '#F7F1E7' },
  index: { fontSize: 13, fontWeight: '900', color: '#9A6A24' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#20160E' },
  cardCopy: { marginTop: 7, fontSize: 14, lineHeight: 21, color: '#62503F' },
  primary: { marginTop: 24, padding: 17, borderRadius: 14, backgroundColor: '#20160E' },
  primaryText: { textAlign: 'center', fontWeight: '800', color: '#FFF' },
  secondary: { marginTop: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#20160E' },
  secondaryText: { textAlign: 'center', fontWeight: '800', color: '#20160E' },
});
