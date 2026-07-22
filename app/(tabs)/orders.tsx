import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import type { CustomerOrderStatus } from '@/contracts/customerGateway';
import { customerGateway } from '@/services/customerGateway';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);
  const [message, setMessage] = useState('Loading your orders…');

  useEffect(() => {
    customerGateway.orders().then((rows) => {
      setOrders(rows);
      setMessage(rows.length ? '' : 'No orders are visible for this approved account yet.');
    }).catch(() => setMessage('Orders are temporarily unavailable.'));
  }, []);

  return <SafeAreaView style={styles.safe}><View style={styles.header}><Text style={styles.kicker}>ORDER DESK</Text><Text style={styles.title}>Orders</Text><Text style={styles.copy}>Follow confirmed orders from production through dispatch.</Text></View><FlatList data={orders} keyExtractor={(item) => item.order_id} ListEmptyComponent={<Text style={styles.empty}>{message}</Text>} renderItem={({ item }) => <View style={styles.card}><View><Text style={styles.number}>{item.order_number ?? 'Order'}</Text><Text style={styles.date}>{item.order_date ?? 'Date pending'}</Text></View><Text style={styles.status}>{item.order_status.replaceAll('_', ' ')}</Text></View>} /></SafeAreaView>;
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},header:{padding:24,gap:7},kicker:{letterSpacing:2,fontSize:12,fontWeight:'700',color:'#7C5B2A'},title:{fontSize:34,fontWeight:'700',color:'#20160E'},copy:{color:'#5A493A'},card:{marginHorizontal:24,marginBottom:14,padding:18,borderRadius:16,backgroundColor:'#F7F1E7',flexDirection:'row',justifyContent:'space-between',gap:16},number:{fontSize:17,fontWeight:'700',color:'#20160E'},date:{marginTop:5,color:'#756455'},status:{textTransform:'capitalize',color:'#7C5B2A',fontWeight:'700'},empty:{padding:24,color:'#5A493A'}});
