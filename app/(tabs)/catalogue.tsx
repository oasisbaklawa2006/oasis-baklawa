import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { PublishedProduct } from '@/contracts/customerGateway';
import { customerGateway } from '@/services/customerGateway';

export default function CatalogueScreen() {
  const [products,setProducts]=useState<PublishedProduct[]>([]);
  const [message,setMessage]=useState('Loading collection…');
  useEffect(()=>{customerGateway.products().then(rows=>{setProducts(rows);setMessage(rows.length?'':'No published products available.');}).catch(()=>setMessage('Catalogue is temporarily unavailable.'));},[]);
  return <SafeAreaView style={styles.safe}><View style={styles.header}><Text style={styles.title}>Catalogue</Text><Text style={styles.copy}>Approved buyer pricing and pack guidance appear after sign-in.</Text></View><FlatList data={products} keyExtractor={item=>item.product_id} ListEmptyComponent={<Text style={styles.empty}>{message}</Text>} renderItem={({item})=><View style={styles.card}><Text style={styles.name}>{item.product_name}</Text><Text style={styles.category}>{item.category ?? 'Oasis collection'}</Text></View>}/></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},header:{padding:24,gap:8},title:{fontSize:34,fontWeight:'700',color:'#20160E'},copy:{color:'#5A493A'},card:{marginHorizontal:24,marginBottom:14,padding:18,borderRadius:16,backgroundColor:'#F7F1E7'},name:{fontSize:18,fontWeight:'700'},category:{marginTop:6,color:'#7C5B2A'},empty:{padding:24,color:'#5A493A'}});
