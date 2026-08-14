import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useResponsiveLayout } from "@/theme/layout";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
}

export function ResponsiveContainer({ children, style, maxWidth }: ResponsiveContainerProps) {
  const { contentWidth, isTablet } = useResponsiveLayout();
  const boundedWidth = Math.min(contentWidth, maxWidth ?? contentWidth);

  return (
    <View style={[styles.outer, isTablet && styles.tabletOuter, style]}>
      <View style={[styles.inner, { maxWidth: boundedWidth, width: "100%" }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, width: "100%" },
  tabletOuter: { alignItems: "center" },
  inner: { flex: 1 },
});
