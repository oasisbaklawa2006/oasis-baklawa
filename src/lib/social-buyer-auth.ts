import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { claimApprovedB2bIdentity, assertApprovedB2bClaimBound } from "@/lib/buyer-identity-claim";
import { invokeBuyerPreflight } from "@/lib/buyer-preflight";
import { normalizeEmail } from "@/lib/buyer-identity";
import { createIdempotencyKey } from "@/lib/idempotency";
import { decideSocialBuyerGate, type SocialBuyerGateDecision } from "@/lib/social-buyer-auth-core";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_SOCIAL_AUTH_ENABLED =
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
export const APPLE_SOCIAL_AUTH_ENABLED =
  process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === "true";

const redirectTo = makeRedirectUri({
  scheme: "oasisbaklawa",
  path: "auth/callback",
});

export type SocialAuthProvider = "google" | "apple";
export type SocialAuthAttempt =
  | { status: "authenticated"; provider: SocialAuthProvider }
  | { status: "cancelled"; provider: SocialAuthProvider };

async function createSessionFromUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(`SOCIAL_AUTH_CALLBACK_FAILED:${errorCode}`);

  const accessToken =
    typeof params.access_token === "string" ? params.access_token : null;
  const refreshToken =
    typeof params.refresh_token === "string" ? params.refresh_token : null;

  if (!accessToken || !refreshToken) {
    throw new Error("SOCIAL_AUTH_CALLBACK_FAILED:session_tokens_missing");
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw new Error(`SOCIAL_AUTH_CALLBACK_FAILED:${error.message}`);
}

export async function signInBuyerWithGoogle(): Promise<SocialAuthAttempt> {
  if (!GOOGLE_SOCIAL_AUTH_ENABLED) {
    throw new Error("Google sign-in is not enabled in this app build.");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    throw new Error(error?.message || "Google sign-in could not be started.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    return { status: "cancelled", provider: "google" };
  }

  await createSessionFromUrl(result.url);
  return { status: "authenticated", provider: "google" };
}

export async function signInBuyerWithApple(): Promise<SocialAuthAttempt> {
  if (!APPLE_SOCIAL_AUTH_ENABLED) {
    throw new Error("Apple sign-in is not enabled in this app build.");
  }
  if (Platform.OS !== "ios" || !(await AppleAuthentication.isAvailableAsync())) {
    throw new Error("Apple sign-in is not available on this device.");
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error("Apple sign-in did not return an identity token.");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    if (error) throw error;

    const nameParts = [
      credential.fullName?.givenName,
      credential.fullName?.middleName,
      credential.fullName?.familyName,
    ].filter((value): value is string => Boolean(value?.trim()));
    if (nameParts.length > 0) {
      await supabase.auth.updateUser({
        data: {
          full_name: nameParts.join(" "),
          given_name: credential.fullName?.givenName ?? null,
          family_name: credential.fullName?.familyName ?? null,
        },
      }).catch(() => undefined);
    }
    return { status: "authenticated", provider: "apple" };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED"
    ) {
      return { status: "cancelled", provider: "apple" };
    }
    throw error;
  }
}

export async function enforceSocialBuyerEligibility(): Promise<SocialBuyerGateDecision> {
  const { data, error } = await supabase.auth.getSession();
  const email = normalizeEmail(data.session?.user.email ?? "");
  if (error || !data.session?.user.id || !email) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return {
      type: "block",
      state: "ambiguous",
      message: "We could not verify the email returned by this sign-in provider.",
    };
  }

  const preflight = await invokeBuyerPreflight(
    "email",
    email,
    `social-${createIdempotencyKey()}`
  );
  const decision = decideSocialBuyerGate(preflight);

  if (decision.type !== "allow") {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return decision;
  }

  try {
    const claim = await claimApprovedB2bIdentity();
    assertApprovedB2bClaimBound(claim, true);
    return { type: "allow" };
  } catch {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return {
      type: "block",
      state: "ambiguous",
      message:
        "This social account is approved, but its Buyer membership could not be linked safely. Use mobile/email OTP or contact Oasis support.",
    };
  }
}
