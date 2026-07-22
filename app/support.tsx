import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { CustomerSupportTicket } from '@/contracts/customerGateway';
import { customerGateway } from '@/services/customerGateway';

export default function SupportScreen() {
  const [tickets, setTickets] = useState<CustomerSupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try { setTickets(await customerGateway.tickets()); } catch { setNotice('Ticket history is temporarily unavailable.'); }
  }
  useEffect(() => { void load(); }, []);

  async function submit() {
    if (!subject.trim() || !message.trim()) return setNotice('Add a subject and a short description.');
    try {
      await customerGateway.submitTicket({ subject: subject.trim(), message: message.trim() });
      setSubject(''); setMessage(''); setNotice('Your request has been submitted to buyer support.');
      await load();
    } catch { setNotice('We could not submit the request. Please try again.'); }
  }

  return <SafeAreaView style={styles.safe}><View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Account</Text></TouchableOpacity><Text style={styles.kicker}>BUYER SUPPORT</Text><Text style={styles.title}>How can we help?</Text></View><View style={styles.form}><TextInput placeholder="Subject" value={subject} onChangeText={setSubject} style={styles.input}/><TextInput multiline placeholder="Describe your request" value={message} onChangeText={setMessage} style={[styles.input,styles.message]}/><TouchableOpacity onPress={submit} style={styles.primary}><Text style={styles.primaryText}>Submit support request</Text></TouchableOpacity>{!!notice&&<Text style={styles.notice}>{notice}</Text>}</View><FlatList data={tickets} keyExtractor={(item)=>item.ticket_id} contentContainerStyle={styles.list} ListHeaderComponent={<Text style={styles.section}>Recent requests</Text>} ListEmptyComponent={<Text style={styles.empty}>No previous requests.</Text>} renderItem={({item})=><View style={styles.card}><Text style={styles.cardTitle}>{item.subject}</Text><Text style={styles.status}>{item.status}</Text></View>}/></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},header:{paddingHorizontal:24,paddingTop:16,gap:8},back:{color:'#7C5B2A'},kicker:{marginTop:12,letterSpacing:2,fontSize:12,fontWeight:'700',color:'#7C5B2A'},title:{fontSize:32,fontWeight:'700',color:'#20160E'},form:{padding:24,gap:12},input:{borderWidth:1,borderColor:'#D8C8B5',borderRadius:14,padding:14,backgroundColor:'#FFF'},message:{minHeight:96,textAlignVertical:'top'},primary:{padding:16,borderRadius:14,backgroundColor:'#20160E'},primaryText:{textAlign:'center',fontWeight:'700',color:'#FFF'},notice:{lineHeight:21,color:'#5A493A'},list:{paddingHorizontal:24,paddingBottom:30},section:{fontSize:18,fontWeight:'700',color:'#20160E',marginBottom:12},card:{padding:16,borderRadius:14,backgroundColor:'#F7F1E7',marginBottom:10},cardTitle:{fontWeight:'700',color:'#20160E'},status:{marginTop:5,textTransform:'capitalize',color:'#7C5B2A'},empty:{color:'#5A493A'}});
