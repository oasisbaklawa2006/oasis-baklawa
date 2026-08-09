export type DeviceClass = "phone" | "tablet" | "tabletLandscape";

const TABLET_MIN_WIDTH = 768;
const LARGE_PHONE_MIN_WIDTH = 414;

export const layout = {
  maxContentWidth: 720,
  maxFormWidth: 560,
  tabletGutter: 32,
  phoneGutter: 24,
} as const;

export function getDeviceClass(width: number, height: number): DeviceClass {
  const isLandscape = width > height;
  if (width >= TABLET_MIN_WIDTH) {
    return isLandscape ? "tabletLandscape" : "tablet";
  }
  return "phone";
}

export function getCatalogueColumns(deviceClass: DeviceClass): number {
  if (deviceClass === "tabletLandscape") return 3;
  if (deviceClass === "tablet") return 2;
  return 1;
}

export function getContentWidth(screenWidth: number): number {
  return Math.min(screenWidth - layout.phoneGutter * 2, layout.maxContentWidth);
}

export function isLargePhoneWidth(width: number, isTablet: boolean): boolean {
  return width >= LARGE_PHONE_MIN_WIDTH && !isTablet;
}
