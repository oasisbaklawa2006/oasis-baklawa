import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { buildBuyerCommunicationLog } from "@/lib/buyer-communication-log";
import { customerGeneralQueryStatusLabel } from "@/lib/customer-projections";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";
import type { CustomerGeneralQuery, CustomerSupportTicket } from "@/types/database.types";
import { colors, spacing, typography } from "@/theme";
type Props = NativeStackScreenProps<RootStackParamList, "CommunicationLog">;
export function CommunicationLogScreen({ navigation, route }: Props) {
 const { entityId }=route.params; const [tickets,setTickets]=useState<CustomerSupportTicket[]>([]); const [queries,setQueries]=useState<CustomerGeneralQuery[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{setError(null);try{const [t,q]=await Promise.all([customerGateway.tickets(),customerGateway.generalQueries()]);setTickets(t??[]);setQueries(q??[]);}catch(e){setError(parseRpcError(e).message);}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const entries=useMemo(()=>{const all=buildBuyerCommunicationLog(tickets,queries);return entityId==="all"?all:all.filter(e=>e.ticket?.order_id===entityId||e.id===entityId);},[entityId,queries,tickets]);
 return <BuyerGate onLogin={()=>navigation.navigate("Login")} onRegister={()=>navigation.navigate("Register")}><Screen title="Communication Log" subtitle="Your Oasis support history" scroll={false}>
 <TouchableOpacity onPress={()=>navigation.goBack()} accessibilityRole="button"><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
 {loading?<LoadingState message="Loading communications…" />:error?<ErrorState message={error} onRetry={load}/>:<FlatList data={entries} keyExtractor={i=>i.id} contentContainerStyle={styles.list} ListEmptyComponent={<EmptyState title="No communications yet" message="Support conversations will appear here."/>} renderItem={({item})=><View style={styles.card}><Text style={styles.title}>{item.ticket?.issue_type??item.query?.subject??"Support"}</Text><Text style={styles.meta}>{item.ticket?`${item.ticket.order_number} · ${item.ticket.customer_status.replace(/_/g," ")}`:item.query?`General enquiry · ${customerGeneralQueryStatusLabel(item.query.status)}`:""}</Text><Text style={styles.copy}>{item.ticket?.description??item.query?.message??""}</Text></View>}/>}
 </Screen></BuyerGate>;
}
const styles=StyleSheet.create({back:{minHeight:48,paddingVertical:spacing.sm,fontFamily:typography.fontFamilySansMedium,color:colors.action},list:{paddingVertical:spacing.md,paddingBottom:spacing.xl},card:{backgroundColor:colors.surfacePremium,borderRadius:14,padding:spacing.md,marginBottom:spacing.sm,borderWidth:1,borderColor:colors.borderLight},title:{fontFamily:typography.fontFamilySansSemiBold,fontSize:typography.sizeMd,color:colors.textPrimary},meta:{marginTop:4,fontFamily:typography.fontFamilySans,fontSize:typography.sizeXs,color:colors.textMuted},copy:{marginTop:spacing.sm,fontFamily:typography.fontFamilySans,fontSize:typography.sizeSm,color:colors.textSecondary,lineHeight:20}});
