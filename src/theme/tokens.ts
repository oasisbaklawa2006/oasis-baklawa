/** Oasis B2B Buyer App — canonical design tokens */
export const colors = {
  canvas: "#EFEFE9",
  surfacePremium: "#F1ECDC",
  surfaceUtility: "#F8F8F8",
  textPrimary: "#2C1810",
  textSecondary: "#5C4A3A",
  textMuted: "#8A7565",
  action: "#5C6B4A",
  actionPressed: "#4A5740",
  accentGold: "#B8A067",
  border: "#D9D2C4",
  borderLight: "#E8E2D6",
  error: "#9B2C2C",
  errorSurface: "#FDF0F0",
  warning: "#8A6B24",
  warningSurface: "#FBF6EA",
  success: "#4A6B4A",
  successSurface: "#F0F5F0",
  white: "#FFFFFF",
  overlay: "rgba(44, 24, 16, 0.45)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
} as const;

export const typography = {
  fontFamilySerif: "LibreCaslonText_400Regular",
  fontFamilySerifBold: "LibreCaslonText_700Bold",
  fontFamilySans: "HankenGrotesk_400Regular",
  fontFamilySansMedium: "HankenGrotesk_500Medium",
  fontFamilySansSemiBold: "HankenGrotesk_600SemiBold",
  fontFamilySansBold: "HankenGrotesk_700Bold",
  sizeXs: 11,
  sizeSm: 13,
  sizeMd: 15,
  sizeLg: 18,
  sizeXl: 22,
  sizeXxl: 28,
  sizeDisplay: 34,
} as const;

export const touchTarget = 44;
