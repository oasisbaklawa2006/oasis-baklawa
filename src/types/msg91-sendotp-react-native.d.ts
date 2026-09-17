// TYPE-CHECKING SHIM ONLY — routed here via tsconfig.json "paths" for the
// exact specifier "@msg91comm/sendotp-react-native". At runtime, Metro/Babel
// resolves the real package from node_modules as normal (tsconfig "paths" is
// a `tsc`-only mapping and does not affect the bundler), so this has no
// effect on the actual app. It exists purely because the package ships its
// .tsx source as the package entry (no separate compiled .d.ts), and that
// source doesn't typecheck cleanly under this project's strict tsconfig —
// a pre-existing issue in the package itself, not ours to fix. Our own usage
// of it lives in src/lib/msg91-otp-widget.ts, typed against the shape below.
export const OTPWidget: {
  initializeWidget: (widgetId: string, tokenAuth: string) => void;
  sendOTP: (data: { identifier: string }) => Promise<unknown>;
  verifyOTP: (data: { reqId: string; otp: string }) => Promise<unknown>;
  retryOTP: (data: { reqId: string; retryChannel?: number }) => Promise<unknown>;
};
export const DefaultWidget: unknown;
export const BiometricAuth: unknown;
