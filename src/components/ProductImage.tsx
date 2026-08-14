import React from "react";
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp } from "react-native";
import { colors, radii } from "@/theme";

interface ProductImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

export function ProductImage({ uri, style, accessibilityLabel }: ProductImageProps) {
  if (!uri) {
    return (
      <View style={[styles.placeholder, style]} accessibilityLabel={accessibilityLabel ?? "Product image unavailable"}>
        <Text style={styles.placeholderText}>Oasis</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, style]}
      accessibilityLabel={accessibilityLabel}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfacePremium,
    borderRadius: radii.md,
  },
  placeholder: {
    backgroundColor: colors.surfacePremium,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  placeholderText: {
    fontSize: 12,
    color: colors.accentGold,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
