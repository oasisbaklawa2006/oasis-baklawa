import { router } from 'expo-router';
import { Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SUPPORT_PHONE = '+919999792959';
const SUPPORT_WHATSAPP = 'https://wa.me/919891162212?text=Hello%20Oasis%20Baklawa%2C%20I%20have%20submitted%20a%20trade%20access%20request%20and%20would%20like%20help%20with%20approval.';

export default function PendingAccessScreen() {
  return <SafeAreaView style={styles.safe}><View style={styles.body}>
    <Text style={styles.kicker}>ACCESS REVIEW IN PROGRESS</Text>
    <Text style={styles.title}>Your buyer account is being reviewed.</Text>
    <Text style={styles.copy}>Our team verifies your business identity, GST and supporting documents before assigning your buyer category and confidential price grade.</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>What happens next</Text><Text style={styles.item}>1. Business and document review</Text><Text style={styles.item}>2. Buyer category and price-grade assignment</Text><Text style={styles.item}>3. Account approval and private catalogue access</Text></View>
    <Text style={styles.copy}>Need urgent access for an active requirement? Call or WhatsApp our buyer-support team.</Text>
    <TouchableOpacity style={styles.primary} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}><Text style={styles.primaryText}>Call for approval assistance</Text></TouchableOpacity>
    <TouchableOpacity style={styles.whatsapp} onPress={() => Linking.openURL(SUPPORT_WHATSAPP)}><Text style={styles.primaryText}>WhatsApp buyer support</Text></TouchableOpacity>
    <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/explore')}><Text style={styles.secondaryText}>Continue exploring without prices</Text></TouchableOpacity>
  </View></SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},body:{flex:1,justifyContent:'center',padding:28,gap:18},kicker:{letterSpacing:2,fontSize:12,fontWeight:'700',color:'#9A6A24'},title:{fontSize:36,lineHeight:42,fontWeight:'700',color:'#20160E'},copy:{fontSize:16,lineHeight:24,color:'#655241'},card:{padding:20,borderRadius:18,backgroundColor:'#F7F1E7',gap:10},cardTitle:{fontSize:18,fontWeight:'800',color:'#20160E'},item:{fontSize:14,lineHeight:21,color:'#5A493A'},primary:{padding:16,borderRadius:14,backgroundColor:'#20160E'},whatsapp:{padding:16,borderRadius:14,backgroundColor:'#1F7A4D'},primaryText:{textAlign:'center',fontWeight:'800',color:'#FFF'},secondary:{padding:16,borderRadius:14,borderWidth:1,borderColor:'#20160E'},secondaryText:{textAlign:'center',fontWeight:'700',color:'#20160E'}});