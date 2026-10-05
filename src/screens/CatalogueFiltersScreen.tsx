import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { fetchPublishedProducts } from "@/lib/api/catalogue";
import { parseRpcError } from "@/lib/rpc-errors";
import type { PublishedProduct } from "@/types/database.types";
import { colors, spacing, typography, touchTarget } from "@/theme";
type Props=NativeStackScreenProps<RootStackParamList,"CatalogueFilters">;
/** Provides filters derived only from published catalogue metadata. */
export function CatalogueFiltersScreen({navigation}:Props){
 const [products,setProducts]=useState<PublishedProduct[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{setLoading(true);setError(null);try{setProducts(await fetchPublishedProducts());}catch(e){setError(parseRpcError(e).message);}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const categories=useMemo(()=>Array.from(new Set(products.map(p=>p.category).filter((x):x is string=>Boolean(x)))).sort(),[products]);
 return <Screen title="Filters" subtitle="Browse by published product categories" scroll={false}>{loading?<LoadingState message="Loading filters…"/>:error?<ErrorState message={error} onRetry={load}/>:<FlatList data={categories} keyExtractor={x=>x} contentContainerStyle={styles.list} renderItem={({item})=><TouchableOpacity style={styles.row} onPress={()=>navigation.navigate("MainTabs",{screen:"Catalogue",params:{category:item}})}><Text style={styles.title}>{item}</Text><Text style={styles.count}>{products.filter(p=>p.category===item).length} products</Text></TouchableOpacity>}/>}</Screen>;
}
const styles=StyleSheet.create({list:{paddingVertical:spacing.md,gap:spacing.sm},row:{minHeight:touchTarget,padding:spacing.md,borderRadius:12,backgroundColor:colors.surfacePremium,borderWidth:1,borderColor:colors.borderLight},title:{fontFamily:typography.fontFamilySansSemiBold,fontSize:typography.sizeMd,color:colors.textPrimary},count:{fontFamily:typography.fontFamilySans,fontSize:typography.sizeXs,color:colors.textMuted,marginTop:4}});
