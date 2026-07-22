import { router } from 'expo-router';
import { Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RejectedAccessScreen() {
  return <SafeAreaView style={styles.safe}><View style={styles.body}>
    <Text style={styles.kicker}>APPLICATION NEEDS ATTENTION</Text>
    <Text style={styles.title}>We could not approve this request yet.</Text>
    <Text style={styles.copy}>This usually means a business detail or supporting document needs clarification. Pricing and ordering remain private until the review is completed.</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>Recommended next step</Text><Text style={styles.cardCopy}>Speak with buyer support, correct the requested information and resubmit the trade application. Your public catalogue access remains available without prices.</Text></View>
    <TouchableOpacity style={styles.primary} onPress={() => Linking.openURL('https://wa.me/919891162212?text=Hello%20Oasis%20Baklawa%2C%20please%20help%20me%20resolve%20my%20trade%20access%20application.')}><Text style={styles.primaryText}>WhatsApp buyer support</Text></TouchableOpacity>
    <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/request-access')}><Text style={styles.secondaryText}>Review application details</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => router.replace('/explore')}><Text style={styles.link}>Explore the public collection</Text></TouchableOpacity>
  </View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},body:{flex:1,justifyContent:'center',padding:28,gap:18},kicker:{letterSpacing:2,fontSize:12,fontWeight:'700',color:'#9A6A24'},title:{fontSize:36,lineHeight:42,fontWeight:'700',color:'#20160E'},copy:{fontSize:16,lineHeight:24,color:'#655241'},card:{padding:20,borderRadius:18,backgroundColor:'#F7F1E7'},cardTitle:{fontSize:18,fontWeight:'800',color:'#20160E'},cardCopy:{marginTop:8,fontSize:14,lineHeight:21,color:'#5A493A'},primary:{padding:16,borderRadius:14,backgroundColor:'#1F7A4D'},primaryText:{textAlign:'center',fontWeight:'800',color:'#FFF'},secondary:{padding:16,borderRadius:14,borderWidth:1,borderColor:'#20160E'},secondaryText:{textAlign:'center',fontWeight:'700',color:'#20160E'},link:{padding:12,textAlign:'center',fontWeight:'700',color:'#8A642F'}});