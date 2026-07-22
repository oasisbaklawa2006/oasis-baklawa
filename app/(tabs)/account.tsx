import { Link } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function AccountScreen() {
  return <SafeAreaView style={styles.safe}><View style={styles.body}><Text style={styles.kicker}>BUYER ACCOUNT</Text><Text style={styles.title}>Account</Text><Text style={styles.copy}>Manage company information, addresses, documents and support in dedicated areas.</Text><View style={styles.list}><Text style={styles.row}>Company profile</Text><Text style={styles.row}>Delivery addresses</Text><Text style={styles.row}>Documents & GST</Text><Text style={styles.row}>Notifications</Text><Link href="/support" style={styles.row}>Support tickets</Link></View></View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},body:{padding:24,gap:14},kicker:{letterSpacing:2,fontSize:12,fontWeight:'700',color:'#7C5B2A'},title:{fontSize:34,fontWeight:'700',color:'#20160E'},copy:{fontSize:16,lineHeight:24,color:'#5A493A'},list:{marginTop:16,gap:10},row:{padding:18,borderRadius:14,overflow:'hidden',backgroundColor:'#F7F1E7',fontSize:16,fontWeight:'600',color:'#20160E'}});
