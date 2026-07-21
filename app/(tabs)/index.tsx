import { Link } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return <SafeAreaView style={styles.safe}><View style={styles.body}><Text style={styles.kicker}>WELCOME BACK</Text><Text style={styles.title}>Your Oasis trade desk</Text><Text style={styles.copy}>Explore new collections, repeat recent orders and track every dispatch.</Text><Link href="/(tabs)/catalogue" style={styles.card}>Browse catalogue</Link><Link href="/(tabs)/orders" style={styles.card}>Repeat or track an order</Link></View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},body:{padding:24,gap:18},kicker:{letterSpacing:2,color:'#7C5B2A',fontWeight:'700'},title:{fontSize:34,fontWeight:'700',color:'#20160E'},copy:{fontSize:17,lineHeight:25,color:'#5A493A'},card:{padding:20,borderRadius:16,backgroundColor:'#F7F1E7',color:'#20160E',fontWeight:'700',overflow:'hidden'}});
