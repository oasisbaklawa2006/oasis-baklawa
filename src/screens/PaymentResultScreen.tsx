import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { BuyerGate } from "@/components/BuyerGate";
import { OasisButton } from "@/components/OasisButton";
import { Screen } from "@/components/Screen";
import { formatInr } from "@/lib/customer-projections";
import { colors, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "PaymentResult">;

export function PaymentResultScreen({ navigation, route }: Props) {
  const { orderId, orderNumber, outcome, amount } = route.params;
  const success = outcome === "success";
  return <BuyerGate onLogin={() => navigation.navigate("Login")} onRegister={() => navigation.navigate("Register")}>
    <Screen title={success ? "Payment received" : "Payment needs attention"} subtitle={orderNumber}>
      <View style={[styles.hero, success ? styles.success : styles.failure]}>
        <Text style={styles.eyebrow}>{success ? "CONFIRMED" : "NOT COMPLETED"}</Text>
        <Text style={styles.title}>{success ? "Your payment has been confirmed." : "Your payment was not completed."}</Text>
        <Text style={styles.copy}>{success ? "Your order payment status has been updated securely." : "No successful payment has been recorded for this attempt. You can review the order and try again."}</Text>
        {typeof amount === "number" ? <Text style={styles.amount}>{formatInr(amount)}</Text> : null}
      </View>
      <View style={styles.actions}>
        {success ? <OasisButton label="View order" onPress={() => navigation.replace("OrderDetail", { orderId })}/> :
          <OasisButton label="Try payment again" onPress={() => navigation.replace("OrderPayment", { orderId, orderNumber })}/>}
        <OasisButton label="View documents" variant="secondary" onPress={() => navigation.navigate("Documents")}/>
        <OasisButton label="Go to orders" variant="secondary" onPress={() => navigation.navigate("MainTabs", { screen: "Orders" })}/>
      </View>
    </Screen>
  </BuyerGate>;
}
const styles=StyleSheet.create({hero:{marginTop:spacing.md,borderRadius:20,padding:spacing.lg,borderWidth:1},success:{backgroundColor:colors.surfacePremium,borderColor:colors.success},failure:{backgroundColor:colors.surfacePremium,borderColor:colors.error},eyebrow:{fontFamily:typography.fontFamilySansSemiBold,fontSize:typography.sizeXs,letterSpacing:1.1,color:colors.textMuted},title:{marginTop:spacing.sm,fontFamily:typography.fontFamilySerifBold,fontSize:typography.sizeXl,color:colors.textPrimary},copy:{marginTop:spacing.sm,fontFamily:typography.fontFamilySans,fontSize:typography.sizeSm,lineHeight:20,color:colors.textSecondary},amount:{marginTop:spacing.lg,fontFamily:typography.fontFamilySansSemiBold,fontSize:typography.sizeXl,color:colors.action},actions:{marginTop:spacing.lg,gap:spacing.md}});
