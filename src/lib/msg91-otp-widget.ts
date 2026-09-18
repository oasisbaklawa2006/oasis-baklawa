// Native MSG91 OTP transport using the official @msg91comm/sendotp-react-native
// SDK (Mobile Integration widget). This is the smallest secure Expo-compatible
// path found for native OTP: no provider secret is ever embedded here — only
// the same class of client-safe widgetId/tokenAuth pair Central already embeds
// in its own web bundle (src/pages/BuyerLogin.tsx: MSG91_WIDGET_ID /
// MSG91_TOKEN_AUTH). Provider verification of the resulting access-token stays
// server-side in msg91-otp / msg91-email-session (Central edge functions) —
// this module never talks to MSG91's privileged REST API directly.
import { OTPWidget } from "@msg91comm/sendotp-react-native";
import { normalizeMsg91SendResponse, type Msg91SendResult } from "@/lib/msg91-otp-contract";

// TODO(deployment): these must be the Buyer App's OWN MSG91 widget
// credentials with "Mobile Integration" enabled in the MSG91 dashboard — they
// are NOT the same widget Central's web login uses. Populate from the MSG91
// account before this ships; do not reuse Central's MSG91_WIDGET_ID /
// MSG91_TOKEN_AUTH, which is scoped to the web widget.
const MSG91_NATIVE_WIDGET_ID = process.env.EXPO_PUBLIC_MSG91_WIDGET_ID ?? "";
const MSG91_NATIVE_TOKEN_AUTH = process.env.EXPO_PUBLIC_MSG91_TOKEN_AUTH ?? "";

let initialized = false;

export function ensureMsg91WidgetInitialized(): void {
  if (initialized) return;
  if (!MSG91_NATIVE_WIDGET_ID || !MSG91_NATIVE_TOKEN_AUTH) {
    throw new Error("msg91_widget_not_configured");
  }
  OTPWidget.initializeWidget(MSG91_NATIVE_WIDGET_ID, MSG91_NATIVE_TOKEN_AUTH);
  initialized = true;
}

/** identifier: E.164-ish digits without '+' for mobile (e.g. "9198XXXXXXXX"), or a bare email. */
export async function sendMsg91Otp(identifier: string): Promise<Msg91SendResult> {
  ensureMsg91WidgetInitialized();
  const response = await OTPWidget.sendOTP({ identifier });
  return normalizeMsg91SendResponse(response);
}

export async function verifyMsg91Otp(reqId: string, otp: string): Promise<string> {
  ensureMsg91WidgetInitialized();
  const response = (await OTPWidget.verifyOTP({ reqId, otp })) as { type?: string; message?: string };
  if (response?.type !== "success" || !response.message) {
    throw new Error(response?.message || "msg91_verify_failed");
  }
  // On success `message` carries the provider access-token (same contract as
  // Central's widget bridge — see extractMsg91AccessToken in BuyerLogin.tsx).
  return response.message;
}

export type Msg91RetryChannel = "SMS-11" | "VOICE-4" | "EMAIL-3" | "WHATSAPP-12";

export async function retryMsg91Otp(reqId: string, channel?: Msg91RetryChannel): Promise<void> {
  ensureMsg91WidgetInitialized();
  const body: { reqId: string; retryChannel?: number } = { reqId };
  if (channel) {
    const code = Number(channel.split("-")[1]);
    if (!Number.isNaN(code)) body.retryChannel = code;
  }
  const response = (await OTPWidget.retryOTP(body)) as { type?: string; message?: string };
  if (response?.type !== "success") {
    throw new Error(response?.message || "msg91_retry_failed");
  }
}
