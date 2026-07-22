import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
  return <SafeAreaView style={styles.safe}><View style={styles.body}>
    <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
    <Text style={styles.kicker}>BUSINESS REGISTRATION</Text>
    <Text style={styles.title}>Join the Oasis buyer network.</Text>
    <Text style={styles.copy}>Oasis Baklawa is a private B2B ordering platform. Every buyer account is reviewed before confidential pricing and ordering access are enabled.</Text>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Who can apply</Text>
      <Text style={styles.cardCopy}>Retailers, distributors, HORECA buyers, corporate gifting teams, ecommerce resellers and established repeat customers.</Text>
    </View>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>What you will need</Text>
      <Text style={styles.cardCopy}>Business details, GST, optional FSSAI licence, registered address and proof such as a visiting card, business document or outlet photograph.</Text>
    </View>
    <TouchableOpacity style={styles.primary} onPress={() => router.push('/request-access')}><Text style={styles.primaryText}>Start access request</Text></TouchableOpacity>
    <TouchableOpacity style={styles.secondary} onPress={() => router.push('/explore')}><Text style={styles.secondaryText}>Explore without prices</Text></TouchableOpacity>
  </View></SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},body:{flex:1,padding:28,gap:18},back:{color:'#7C5B2A',fontSize:16},kicker:{marginTop:22,letterSpacing:2,fontSize:12,fontWeight:'700',color:'#9A6A24'},title:{fontSize:36,lineHeight:42,fontWeight:'700',color:'#20160E'},copy:{fontSize:17,lineHeight:25,color:'#5A493A'},card:{padding:20,borderRadius:18,backgroundColor:'#F7F1E7'},cardTitle:{fontSize:18,fontWeight:'800',color:'#20160E'},cardCopy:{marginTop:8,lineHeight:22,color:'#5A493A'},primary:{marginTop:'auto',padding:17,borderRadius:14,backgroundColor:'#20160E'},primaryText:{textAlign:'center',fontWeight:'800',color:'#FFF'},secondary:{padding:16,borderRadius:14,borderWidth:1,borderColor:'#20160E'},secondaryText:{textAlign:'center',fontWeight:'700',color:'#20160E'}});