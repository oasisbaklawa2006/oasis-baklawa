import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import type { CartonConfiguration, CartonPreview } from "@/lib/carton-builder";
import { cartonAccessibility, cartonCellStates, cartonMotion } from "@/lib/carton-visual-model";
import { describeCarton } from "@/lib/carton-presentation";
import { colors, radii, spacing, typography } from "@/theme";

interface Props {
  config: Pick<CartonConfiguration, "label" | "innerPack" | "slotArrangement">;
  preview: CartonPreview;
}

/**
 * Buyer-facing carton illustration schematic: capacity, filled, remaining and progress.
 * It is an illustration only and never implies any packing, dispatch or Trace event. Approved artwork is
 * wired through CartonConfiguration.visualAssets once the assets are supplied; until then slots are drawn as
 * neutral cells (no physical arrangement is implied unless slotArrangement is verified).
 */
export function CartonVisual({ config, preview }: Props) {
  const copy = describeCarton(preview, config.innerPack);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(preview.percentage)).current;

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => alive && setReduceMotion(value))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const motion = cartonMotion(reduceMotion);
    if (!motion.animate) {
      progress.setValue(preview.percentage);
      return;
    }
    Animated.timing(progress, { toValue: preview.percentage, duration: motion.durationMs, useNativeDriver: false }).start();
  }, [preview.percentage, progress, reduceMotion]);

  const cells = cartonCellStates(preview);
  const showCells = cells.length > 0;
  const a11y = cartonAccessibility(config.label, copy, preview);
  const columns = config.slotArrangement?.columns;

  return (
    <View
      style={[styles.card, preview.state === "invalid" && styles.cardInvalid, copy.sealedIllustration && styles.cardSealed]}
      accessible={a11y.accessible}
      accessibilityRole={a11y.accessibilityRole}
      accessibilityLabel={a11y.accessibilityLabel}
      accessibilityValue={a11y.accessibilityValue}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{config.label}</Text>
        <Text style={styles.count}>{copy.progressLabel}</Text>
      </View>
      {showCells ? (
        <View style={[styles.cells, columns ? { maxWidth: columns * 52 } : null]}>
          {cells.map((filled, i) => (
            <View key={i} style={[styles.cell, filled && styles.cellFilled]} />
          ))}
        </View>
      ) : null}
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"], extrapolate: "clamp" }) }]}
        />
      </View>
      <Text style={styles.headline}>{copy.headline}</Text>
      {copy.remainingLabel ? <Text style={styles.meta}>{copy.remainingLabel}</Text> : null}
      {copy.sealedIllustration ? <Text style={styles.sealed}>Sealed — illustration only</Text> : null}
      {copy.guidance.map((line) => (
        <Text key={line} style={styles.guidance}>{line}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfacePremium, gap: spacing.sm },
  cardInvalid: { borderColor: colors.warning, backgroundColor: colors.warningSurface },
  cardSealed: { borderColor: colors.success, backgroundColor: colors.successSurface },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { flexShrink: 1, fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  count: { fontFamily: typography.fontFamilySansBold, fontSize: typography.sizeMd, color: colors.textPrimary },
  cells: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  cell: { width: 44, height: 28, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceUtility },
  cellFilled: { backgroundColor: colors.accentGold, borderColor: colors.accentBronze },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.borderLight, overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.action },
  headline: { fontFamily: typography.fontFamilySansSemiBold, fontSize: typography.sizeSm, color: colors.textPrimary },
  meta: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textMuted },
  sealed: { fontFamily: typography.fontFamilySansMedium, fontSize: typography.sizeXs, color: colors.success },
  guidance: { fontFamily: typography.fontFamilySans, fontSize: typography.sizeXs, color: colors.textSecondary, lineHeight: 18 },
});
