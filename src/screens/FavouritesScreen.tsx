import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { ProductImage } from "@/components/ProductImage";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { useCustomerFavourites } from "@/hooks/useCustomerFavourites";
import { fetchCatalogue, type CatalogueProduct } from "@/lib/api/catalogue";
import { parseRpcError } from "@/lib/rpc-errors";
import { colors, spacing, typography, touchTarget } from "@/theme";
type Props = NativeStackScreenProps<RootStackParamList, "Favourites">;
/** Shows the approved buyer's server-authoritative favourite products. */
export function FavouritesScreen({ navigation }: Props) {
 const { isApprovedBuyer } = useBuyerSession(); const { favourites, toggleFavourite } = useCustomerFavourites();
 const [products,setProducts]=useState<CatalogueProduct[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);
 const removeFavourite=useCallback(async(productId:string)=>{setError(null);try{await toggleFavourite(productId,false);}catch(e){setError(parseRpcError(e).message);}},[toggleFavourite]);
 const load=useCallback(async()=>{setLoading(true);setError(null);try{setProducts(await fetchCatalogue({includeBuyerPrices:isApprovedBuyer}));}catch(e){setError(parseRpcError(e).message);}finally{setLoading(false);}},[isApprovedBuyer]);
 useEffect(()=>{void load();},[load]); const rows=useMemo(()=>products.filter(p=>favourites.includes(p.product_id)),[favourites,products]);
 return <BuyerGate onLogin={()=>navigation.navigate("Login")} onRegister={()=>navigation.navigate("Register")} requireApprovedBuyer><Screen title="Favourites" subtitle="Products you saved for quick access" scroll={false}>{loading?<LoadingState message="Loading favourites…" />:error?<ErrorState message={error} onRetry={load}/>:<FlatList data={rows} keyExtractor={i=>i.product_id} contentContainerStyle={styles.list} ListEmptyComponent={<EmptyState title="No favourites yet" message="Save products from the catalogue and they will appear here."/>} renderItem={({item})=><View style={styles.card}><TouchableOpacity onPress={()=>navigation.navigate("ProductDetail",{productId:item.product_id})}><ProductImage uri={item.hero_image_url} style={styles.image}/></TouchableOpacity><View style={styles.info}><Text style={styles.title}>{item.product_name}</Text><Text style={styles.meta}>{item.subcategory??item.category??"Oasis collection"}</Text>{item.price?<Text style={styles.price}>₹{item.price.selling_price.toFixed(2)} / {item.price.uom}</Text>:null}<TouchableOpacity style={styles.remove} onPress={()=>void removeFavourite(item.product_id)}><Text style={styles.removeText}>Remove</Text></TouchableOpacity></View></View>}/>}</Screen></BuyerGate>;
}
const styles=StyleSheet.create({list:{paddingVertical:spacing.md,paddingBottom:spacing.xl,gap:spacing.md},card:{flexDirection:"row",gap:spacing.md,padding:spacing.md,borderRadius:14,backgroundColor:colors.surfacePremium,borderWidth:1,borderColor:colors.borderLight},image:{width:112,height:112,borderRadius:12},info:{flex:1},title:{fontFamily:typography.fontFamilySansSemiBold,fontSize:typography.sizeMd,color:colors.textPrimary},meta:{fontFamily:typography.fontFamilySans,fontSize:typography.sizeXs,color:colors.textMuted,marginTop:4},price:{fontFamily:typography.fontFamilySansSemiBold,fontSize:typography.sizeSm,color:colors.textPrimary,marginTop:8},remove:{minHeight:touchTarget,justifyContent:"center",alignSelf:"flex-start"},removeText:{fontFamily:typography.fontFamilySansMedium,fontSize:typography.sizeSm,color:colors.action}});
