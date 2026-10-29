import type { CartonIssue, CartonPreview } from "@/lib/carton-builder";

/** Buyer-facing wording for a carton preview. Courteous, specific and never pressuring. */
export interface CartonPresentation {
  headline: string;
  progressLabel: string;
  remainingLabel: string;
  accessibilityLabel: string;
  guidance: string[];
  sealedIllustration: boolean;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function describeCarton(preview: CartonPreview, innerPack = "tray"): CartonPresentation {
  const progressLabel = `${preview.filledSlots} of ${preview.capacity}`;
  const remaining = preview.remainingSlots;
  const guidance: string[] = [];
  let headline: string;
  let remainingLabel: string;

  if (preview.state === "invalid") {
    headline = "This carton needs a small adjustment";
    remainingLabel = "";
    for (const issue of preview.issues) guidance.push(issue.message);
  } else if (preview.physicallyComplete) {
    headline = "Carton complete";
    remainingLabel = "No space remaining";
    guidance.push("This is an illustration of your completed carton. Order rules are still checked when you proceed.");
  } else if (preview.filledSlots === 0) {
    headline = "Empty carton";
    remainingLabel = `${plural(remaining, innerPack)} to fill`;
  } else {
    headline = "Carton in progress";
    remainingLabel = `${plural(remaining, innerPack)} remaining`;
    guidance.push(`Adding ${plural(remaining, innerPack)} of a compatible product would complete this carton.`);
  }

  return {
    headline,
    progressLabel,
    remainingLabel,
    accessibilityLabel: `${headline}. ${plural(preview.filledSlots, innerPack)} of ${preview.capacity}. ${remainingLabel}`.trim(),
    guidance,
    sealedIllustration: preview.state === "sealed-preview",
  };
}

export function issueSummary(issues: readonly CartonIssue[]): string[] {
  return Array.from(new Set(issues.map((i) => i.message)));
}
