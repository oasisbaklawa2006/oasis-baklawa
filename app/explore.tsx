import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { PublishedProduct } from '@/contracts/customerGateway';
import { customerGateway } from '@/services/customerGateway';

export default function PublicExploreScreen() {
  const [products, setProducts] = useState<PublishedProduct[]>([]);
  const [message, setMessage] = useState('Loading the collection…');

  useEffect(() => {
    customerGateway.products().then((rows) => {
      setProducts(rows);
      setMessage(rows.length ? '' : 'No published products are available right now.');
    }).catch(() => setMessage('The collection is temporarily unavailable.'));
  }, []);

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
      <Text style={styles.kicker}>THE OASIS COLLECTION</Text>
      <Text style={styles.title}>A glimpse of our craft.</Text>
      <Text style={styles.copy}>Visitors may explore approved products and the brand experience. Trade pricing, pack economics and ordering remain reserved for approved buyers.</Text>
    </View>
    <FlatList
      data={products}
      keyExtractor={(item) => item.product_id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>{message}</Text>}
      renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => router.push('/sign-in')}>
        <View style={styles.media}><Text style={styles.mediaText}>OASIS</Text></View>
        <Text style={styles.name}>{item.product_name}</Text>
        <Text style={styles.category}>{item.category ?? 'Oasis collection'}</Text>
        {!!item.description && <Text numberOfLines={2} style={styles.description}>{item.description}</Text>}
        <View style={styles.privateRow}><Text style={styles.private}>Trade pricing available after approval</Text><Text style={styles.arrow}>›</Text></View>
      </TouchableOpacity>}
      ListFooterComponent={<View style={styles.footer}><Text style={styles.footerTitle}>Buying for business?</Text><Text style={styles.footerCopy}>Request access for confidential pricing, MOQ guidance, quick ordering and dispatch visibility.</Text><TouchableOpacity style={styles.primary} onPress={() => router.push('/request-access')}><Text style={styles.primaryText}>Request trade access</Text></TouchableOpacity></View>}
    />
  </SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},header:{padding:24,paddingBottom:10,gap:8},back:{color:'#7C5B2A',fontSize:16,marginBottom:12},kicker:{letterSpacing:2.2,fontSize:12,fontWeight:'700',color:'#9A6A24'},title:{fontSize:36,lineHeight:42,fontWeight:'700',color:'#20160E'},copy:{fontSize:15,lineHeight:23,color:'#665443'},list:{padding:24,paddingTop:12,gap:14},card:{padding:16,borderRadius:20,backgroundColor:'#FFF',borderWidth:1,borderColor:'#E8DCCD'},media:{height:150,borderRadius:15,backgroundColor:'#F3E8D8',alignItems:'center',justifyContent:'center'},mediaText:{letterSpacing:4,fontWeight:'800',color:'#A88655'},name:{marginTop:15,fontSize:19,fontWeight:'800',color:'#20160E'},category:{marginTop:5,fontSize:13,fontWeight:'700',color:'#9A6A24'},description:{marginTop:8,fontSize:14,lineHeight:20,color:'#6B5948'},privateRow:{marginTop:14,paddingTop:13,borderTopWidth:1,borderTopColor:'#EEE3D6',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},private:{fontSize:12,fontWeight:'700',color:'#6B5948'},arrow:{fontSize:24,color:'#9A6A24'},empty:{paddingVertical:36,color:'#665443'},footer:{marginTop:10,padding:20,borderRadius:20,backgroundColor:'#20160E',gap:10},footerTitle:{fontSize:21,fontWeight:'800',color:'#FFF'},footerCopy:{fontSize:14,lineHeight:21,color:'#E8DCCF'},primary:{marginTop:6,padding:15,borderRadius:13,backgroundColor:'#FFF'},primaryText:{textAlign:'center',fontWeight:'800',color:'#20160E'}});