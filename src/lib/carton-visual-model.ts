import type { CartonPreview } from "@/lib/carton-builder";
import type { CartonPresentation } from "@/lib/carton-presentation";

/**
 * Pure model behind CartonVisual so motion, rendering limits and accessibility semantics are unit-testable
 * without a native renderer.
 */

/** Above this many slots a compact meter replaces per-slot cells to keep rendering cheap. */
export const MAX_CARTON_CELLS = 24;
export const CARTON_PROGRESS_ANIMATION_MS = 180;

export interface CartonMotion {
  animate: boolean;
  durationMs: number;
}

/** Reduced motion means no animation at all: the state changes immediately. */
export function cartonMotion(reduceMotionEnabled: boolean): CartonMotion {
  return reduceMotionEnabled ? { animate: false, durationMs: 0 } : { animate: true, durationMs: CARTON_PROGRESS_ANIMATION_MS };
}

export function shouldShowCartonCells(capacity: number): boolean {
  return Number.isSafeInteger(capacity) && capacity > 0 && capacity <= MAX_CARTON_CELLS;
}

/** One entry per slot: true when filled. Empty when cells are not shown. */
export function cartonCellStates(preview: Pick<CartonPreview, "capacity" | "filledSlots">): boolean[] {
  if (!shouldShowCartonCells(preview.capacity)) return [];
  const filled = Math.max(0, Math.min(preview.filledSlots, preview.capacity));
  return Array.from({ length: preview.capacity }, (_, i) => i < filled);
}

export interface CartonAccessibility {
  accessible: true;
  accessibilityRole: "progressbar";
  accessibilityLabel: string;
  accessibilityValue: { min: number; max: number; now: number };
}

export function cartonAccessibility(
  label: string,
  copy: Pick<CartonPresentation, "accessibilityLabel">,
  preview: Pick<CartonPreview, "capacity" | "filledSlots">
): CartonAccessibility {
  const max = Math.max(0, preview.capacity);
  return {
    accessible: true,
    accessibilityRole: "progressbar",
    accessibilityLabel: `${label}. ${copy.accessibilityLabel}`,
    accessibilityValue: { min: 0, max, now: Math.max(0, Math.min(preview.filledSlots, max)) },
  };
}
