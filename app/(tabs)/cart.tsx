import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function CartScreen() {
  return <SafeAreaView style={styles.safe}><View style={styles.body}><Text style={styles.kicker}>TRADE CART</Text><Text style={styles.title}>Your cart</Text><Text style={styles.copy}>Products will appear here with pack-size, minimum quantity and ordering-multiple guidance.</Text><View style={styles.card}><Text style={styles.cardTitle}>Ready for efficient ordering</Text><Text style={styles.cardCopy}>Use Catalogue for discovery or Quick Order for repeat SKUs. Quantity steppers will guide complete cases without interrupting your flow.</Text></View></View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},body:{padding:24,gap:14},kicker:{letterSpacing:2,fontSize:12,fontWeight:'700',color:'#7C5B2A'},title:{fontSize:34,fontWeight:'700',color:'#20160E'},copy:{fontSize:16,lineHeight:24,color:'#5A493A'},card:{marginTop:18,padding:20,borderRadius:16,backgroundColor:'#F7F1E7'},cardTitle:{fontSize:18,fontWeight:'700',color:'#20160E'},cardCopy:{marginTop:8,lineHeight:22,color:'#5A493A'}});
