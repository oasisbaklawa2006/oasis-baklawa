import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const BUSINESS_TYPES = ['Retailer', 'Wholesaler / Distributor', 'HoReCa', 'Gifting / Corporate', 'E-commerce Reseller', 'Other'];

type FormState = {
  businessName: string;
  tradeName: string;
  businessType: string;
  contactPerson: string;
  mobileNumber: string;
  contactEmail: string;
  registeredAddress: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  fssaiNumber: string;
};

const initialForm: FormState = {
  businessName: '', tradeName: '', businessType: '', contactPerson: '', mobileNumber: '', contactEmail: '',
  registeredAddress: '', city: '', state: '', pincode: '', gstNumber: '', fssaiNumber: '',
};

export default function RequestAccessScreen() {
  const [form, setForm] = useState(initialForm);
  const [tradeDeclaration, setTradeDeclaration] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const complete = useMemo(() => Boolean(
    form.businessName.trim() && form.businessType && form.contactPerson.trim() && /^\d{10}$/.test(form.mobileNumber.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim()) && form.registeredAddress.trim() && form.city.trim() &&
    form.state.trim() && /^\d{6}$/.test(form.pincode.trim()) && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.gstNumber.trim().toUpperCase()) &&
    tradeDeclaration && dataConsent
  ), [dataConsent, form, tradeDeclaration]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    if (!complete) {
      Alert.alert('Complete your trade profile', 'Please complete all required business, contact, address and GST fields and accept both declarations.');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return <SafeAreaView style={styles.safe}><View style={styles.success}>
      <Text style={styles.kicker}>APPLICATION PREPARED</Text>
      <Text style={styles.title}>Your trade access request is ready for review.</Text>
      <Text style={styles.copy}>The production submission remains intentionally disabled until the governed registration RPC and private document-upload contract are available. No operational table was written directly.</Text>
      <TouchableOpacity style={styles.primary} onPress={() => router.replace('/access/pending')}><Text style={styles.primaryText}>View approval status</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/')}><Text style={styles.secondaryText}>Return to welcome</Text></TouchableOpacity>
    </View></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
      <Text style={styles.kicker}>REQUEST TRADE ACCESS</Text>
      <Text style={styles.title}>Tell us about your business.</Text>
      <Text style={styles.copy}>Pricing and ordering are reserved for approved trade accounts. Our team reviews every application and assigns the appropriate buyer category and price grade.</Text>

      <Section title="Business identity">
        <Field label="Legal business name *" value={form.businessName} onChangeText={(v) => set('businessName', v)} placeholder="Registered entity name" />
        <Field label="Trade / outlet name" value={form.tradeName} onChangeText={(v) => set('tradeName', v)} placeholder="Brand or store name" />
        <Text style={styles.label}>Business type *</Text>
        <View style={styles.chips}>{BUSINESS_TYPES.map((type) => <TouchableOpacity key={type} style={[styles.chip, form.businessType === type && styles.chipActive]} onPress={() => set('businessType', type)}><Text style={[styles.chipText, form.businessType === type && styles.chipTextActive]}>{type}</Text></TouchableOpacity>)}</View>
      </Section>

      <Section title="Primary contact">
        <Field label="Contact person *" value={form.contactPerson} onChangeText={(v) => set('contactPerson', v)} placeholder="Full name" />
        <Field label="Mobile number *" value={form.mobileNumber} onChangeText={(v) => set('mobileNumber', v.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" keyboardType="phone-pad" />
        <Field label="Business email *" value={form.contactEmail} onChangeText={(v) => set('contactEmail', v)} placeholder="you@business.com" keyboardType="email-address" autoCapitalize="none" />
      </Section>

      <Section title="Registered address">
        <Field label="Address *" value={form.registeredAddress} onChangeText={(v) => set('registeredAddress', v)} placeholder="Full registered address" multiline />
        <Field label="City *" value={form.city} onChangeText={(v) => set('city', v)} placeholder="City" />
        <Field label="State *" value={form.state} onChangeText={(v) => set('state', v)} placeholder="State" />
        <Field label="Pincode *" value={form.pincode} onChangeText={(v) => set('pincode', v.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" keyboardType="number-pad" />
      </Section>

      <Section title="Licences and verification">
        <Field label="GST number *" value={form.gstNumber} onChangeText={(v) => set('gstNumber', v.toUpperCase().slice(0, 15))} placeholder="07AAFCT0640R1ZZ" autoCapitalize="characters" />
        <Field label="FSSAI number" value={form.fssaiNumber} onChangeText={(v) => set('fssaiNumber', v.replace(/\D/g, '').slice(0, 14))} placeholder="Optional 14-digit licence" keyboardType="number-pad" />
        <DocumentPlaceholder title="GST certificate" subtitle="PDF or image" />
        <DocumentPlaceholder title="Business proof" subtitle="Visiting card, outlet photograph or business document" />
      </Section>

      <Section title="Declarations">
        <CheckRow checked={tradeDeclaration} onPress={() => setTradeDeclaration((v) => !v)} text="I confirm this application is for genuine trade or wholesale purchasing and the information provided is accurate." />
        <CheckRow checked={dataConsent} onPress={() => setDataConsent((v) => !v)} text="I consent to Oasis Baklawa reviewing these details and contacting me about account approval." />
      </Section>

      <TouchableOpacity style={[styles.primary, !complete && styles.disabled]} onPress={submit}><Text style={styles.primaryText}>Prepare access request</Text></TouchableOpacity>
      <Text style={styles.note}>Urgent approval notification, secure document upload and grade assignment require a governed backend contract. This screen does not bypass that control.</Text>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, multiline, ...rest } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...rest} multiline={multiline} style={[styles.input, multiline && styles.multiline]} placeholderTextColor="#9A8875" /></View>; }
function DocumentPlaceholder({ title, subtitle }: { title: string; subtitle: string }) { return <TouchableOpacity style={styles.upload} onPress={() => Alert.alert('Secure upload pending', 'Document selection will be enabled only with the governed private-storage upload contract.')}><Text style={styles.uploadTitle}>{title}</Text><Text style={styles.uploadCopy}>{subtitle}</Text></TouchableOpacity>; }
function CheckRow({ checked, onPress, text }: { checked: boolean; onPress: () => void; text: string }) { return <TouchableOpacity style={styles.checkRow} onPress={onPress}><View style={[styles.check, checked && styles.checkActive]}><Text style={styles.checkMark}>{checked ? '✓' : ''}</Text></View><Text style={styles.checkText}>{text}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#FFFDF9'},flex:{flex:1},body:{padding:24,paddingBottom:48,gap:18},back:{color:'#7C5B2A',fontSize:16},kicker:{marginTop:12,letterSpacing:2.2,fontSize:12,fontWeight:'700',color:'#9A6A24'},title:{fontSize:36,lineHeight:42,fontWeight:'700',color:'#20160E'},copy:{fontSize:16,lineHeight:24,color:'#665443'},section:{gap:13,padding:18,borderRadius:20,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#E9DED0'},sectionTitle:{fontSize:20,fontWeight:'700',color:'#20160E',marginBottom:2},field:{gap:6},label:{fontSize:13,fontWeight:'700',color:'#4A3829'},input:{borderWidth:1,borderColor:'#D9CABB',borderRadius:14,paddingHorizontal:15,paddingVertical:14,fontSize:16,color:'#20160E',backgroundColor:'#FFFDF9'},multiline:{minHeight:92,textAlignVertical:'top'},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{paddingVertical:10,paddingHorizontal:12,borderRadius:999,borderWidth:1,borderColor:'#D9CABB'},chipActive:{backgroundColor:'#20160E',borderColor:'#20160E'},chipText:{fontSize:13,color:'#5A493A'},chipTextActive:{color:'#FFF'},upload:{padding:16,borderRadius:14,borderWidth:1,borderStyle:'dashed',borderColor:'#BDA98F',backgroundColor:'#FAF5ED'},uploadTitle:{fontWeight:'700',color:'#20160E'},uploadCopy:{marginTop:4,fontSize:13,lineHeight:18,color:'#756455'},checkRow:{flexDirection:'row',alignItems:'flex-start',gap:11},check:{width:24,height:24,borderWidth:1,borderColor:'#A88E6D',borderRadius:7,alignItems:'center',justifyContent:'center',marginTop:1},checkActive:{backgroundColor:'#20160E',borderColor:'#20160E'},checkMark:{color:'#FFF',fontWeight:'800'},checkText:{flex:1,fontSize:14,lineHeight:21,color:'#5A493A'},primary:{padding:17,borderRadius:15,backgroundColor:'#20160E'},disabled:{opacity:.55},primaryText:{textAlign:'center',fontWeight:'800',color:'#FFF'},secondary:{padding:16,borderRadius:15,borderWidth:1,borderColor:'#20160E'},secondaryText:{textAlign:'center',fontWeight:'700',color:'#20160E'},note:{fontSize:12,lineHeight:18,color:'#7B6A5A'},success:{flex:1,justifyContent:'center',padding:28,gap:20}
});