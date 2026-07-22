import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';

export default function SignInScreen() {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.trim()) return setMessage('Enter your approved business email.');
    try {
      setSubmitting(true);
      setMessage('');
      await signInWithOtp(email.trim());
      setMessage('Secure sign-in link sent. Open it on this device to continue.');
    } catch {
      setMessage('We could not start sign-in. Confirm the email or contact buyer support.');
    } finally {
      setSubmitting(false);
    }
  }

  return <SafeAreaView style={styles.safe}><View style={styles.body}>
    <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
    <Text style={styles.kicker}>PRIVATE BUYER ACCESS</Text>
    <Text style={styles.title}>Welcome back</Text>
    <Text style={styles.copy}>Use the email approved for your Oasis Baklawa trade account.</Text>
    <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Business email" value={email} onChangeText={setEmail} style={styles.input} />
    <TouchableOpacity disabled={submitting} onPress={submit} style={styles.primary}><Text style={styles.primaryText}>{submitting ? 'Sending…' : 'Send secure sign-in link'}</Text></TouchableOpacity>
    {!!message && <Text style={styles.message}>{message}</Text>}
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({safe:{flex:1,backgroundColor:'#FFFDF9'},body:{flex:1,padding:28,gap:18},back:{fontSize:16,color:'#7C5B2A'},kicker:{marginTop:30,letterSpacing:2,fontSize:12,fontWeight:'700',color:'#7C5B2A'},title:{fontSize:38,fontWeight:'700',color:'#20160E'},copy:{fontSize:17,lineHeight:25,color:'#5A493A'},input:{marginTop:18,borderWidth:1,borderColor:'#D8C8B5',borderRadius:14,padding:16,fontSize:16,backgroundColor:'#FFF'},primary:{borderRadius:14,padding:17,backgroundColor:'#20160E'},primaryText:{textAlign:'center',fontWeight:'700',color:'#FFF'},message:{lineHeight:22,color:'#5A493A'}});
