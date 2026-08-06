import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  scroll?: boolean;
}

export function Screen({ title, subtitle, children, scroll = true }: ScreenProps) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Body style={styles.body} contentContainerStyle={scroll ? styles.scrollContent : undefined}>
        {children}
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF8F2" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0DED0",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#7A1B2B" },
  subtitle: { fontSize: 13, color: "#8A6B5C", marginTop: 4 },
  body: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 32 },
});
